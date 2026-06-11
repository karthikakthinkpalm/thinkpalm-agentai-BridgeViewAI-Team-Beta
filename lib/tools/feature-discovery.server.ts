import 'server-only';

import type { RequirementAnalysis, SelectedWidget } from '@/lib/types/pipeline';
import type { FeatureDiscoveryResult, FeatureRecommendation, VesselType } from '@/lib/types/feature-discovery';
import type { DomainCoverage } from '@/lib/types/feature-discovery';
import { getFeatureDiscoveryConfig, matchesAnyPattern } from './config-loader';
import { isLlmEnabled, llmFeatureRecommendations, withLlmFallback } from './llm-fallback';
import {
  analyzeDomainCoverage,
  buildWidgetExplainability,
  evaluateDashboardHealth,
  expandWidgetsFromNewFields,
  extractRequirements,
  generateMissingFeatureRecommendations,
} from './feature-discovery';
import { mapWidgets } from './widget-mapper';

const config = () => getFeatureDiscoveryConfig();

function filterByConfidence(recs: FeatureRecommendation[]): FeatureRecommendation[] {
  return recs.filter((r) => r.confidence > config().confidenceThreshold);
}

function dedupeRecommendations(recs: FeatureRecommendation[]): FeatureRecommendation[] {
  const seen = new Set<string>();
  return recs.filter((r) => {
    const key = `${r.feature}:${r.widget}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function generateMissingFeatureRecommendationsAsync(
  coverage: DomainCoverage[],
  vesselType: VesselType,
  prd: string,
  domainContext?: string,
  provider?: 'groq' | 'gemini'
): Promise<{ recommendations: FeatureRecommendation[]; source: 'config' | 'llm' }> {
  const missingDomains = coverage.filter((c) => !c.covered).map((c) => c.domain);
  const configRecs = generateMissingFeatureRecommendations(coverage, vesselType, prd);

  // Concrete architecture: Pass the expert system's config recommendations to the LLM.
  // The LLM acts as a semantic gatekeeper: it filters out config matches that don't fit the domain,
  // and invents new domain-specific widgets where necessary.
  if (isLlmEnabled()) {
    try {
      const llmResult = await llmFeatureRecommendations(prd, missingDomains, domainContext, configRecs, provider);
      if (llmResult.length > 0) {
        return { recommendations: dedupeRecommendations(filterByConfidence(llmResult)), source: 'llm' };
      }
    } catch (err) {
      console.warn('LLM feature discovery failed — falling back to config rules', err);
    }
  }

  // Fallback to static ship-centric config rules only if LLM is down or returned nothing.
  return { recommendations: dedupeRecommendations(filterByConfidence(configRecs)), source: 'config' };
}

/** Async variant with LLM enrichment for sparse config matches. */
export async function runFeatureDiscoveryAsync(
  prd: string,
  options: {
    requirements?: RequirementAnalysis;
    selectedWidgets?: SelectedWidget[];
    dataset?: Record<string, unknown>;
  } = {},
  provider?: 'groq' | 'gemini'
): Promise<FeatureDiscoveryResult & { recommendationSource?: 'config' | 'llm' }> {
  const { requirements, selectedWidgets = [], dataset } = options;

  const reqExtraction = extractRequirements(prd, requirements);
  const widgetNames = [...selectedWidgets.map((w) => w.name), ...mapWidgets(prd)];
  const uniqueWidgets = [...new Set(widgetNames)];
  const domainCoverage = analyzeDomainCoverage(prd, uniqueWidgets, requirements);

  const { recommendations: llmRecs, source } = await generateMissingFeatureRecommendationsAsync(
    domainCoverage,
    reqExtraction.vesselType,
    prd,
    requirements?.domain,
    provider
  );

  let recommendations = llmRecs;
  let autoExpandedWidgets: string[] = [];

  if (dataset && Object.keys(dataset).length > 0) {
    const expansion = expandWidgetsFromNewFields(dataset, uniqueWidgets, requirements?.domain);
    autoExpandedWidgets = expansion.widgets;
    recommendations = dedupeRecommendations([...recommendations, ...expansion.recommendations]);
  }

  const dashboardHealth = evaluateDashboardHealth(domainCoverage, recommendations);

  const vesselTypeRecommendations =
    reqExtraction.vesselType !== 'General'
      ? filterByConfidence(config().vesselIntelligence[reqExtraction.vesselType] ?? [])
      : [];

  const predictiveFeatures = filterByConfidence(
    config()
      .predictivePatterns.filter((p) => matchesAnyPattern(prd, [p.pattern]))
      .map((p) => p.feature)
  );

  return {
    requirements: reqExtraction,
    domainCoverage,
    dashboardHealth,
    vesselTypeRecommendations,
    predictiveFeatures,
    widgetExplainability: buildWidgetExplainability(selectedWidgets, prd, requirements),
    autoExpandedWidgets,
    recommendationSource: source,
  };
}
