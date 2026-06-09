import type { RequirementAnalysis, SelectedWidget } from '@/lib/types/pipeline';
import type {
  DashboardHealth,
  DomainCoverage,
  FeatureDiscoveryResult,
  FeatureRecommendation,
  MaritimeDomain,
  RequirementExtraction,
  VesselType,
  WidgetExplainability,
} from '@/lib/types/feature-discovery';
import {
  getFeatureDiscoveryConfig,
  inferDomainFromField,
  matchesAnyPattern,
  resolveWidgetArchetype,
  type ConfigDomainRule,
} from './config-loader';
import { recommendFromDataset } from './dataset-viz-agent';
import { mapWidgets } from './widget-mapper';

const config = () => getFeatureDiscoveryConfig();

export function detectVesselType(prd: string): VesselType {
  for (const rule of config().vesselTypeRules) {
    if (matchesAnyPattern(prd, [rule.pattern])) return rule.type;
  }
  return 'General';
}

export function extractRequirements(prd: string, requirements?: RequirementAnalysis): RequirementExtraction {
  const lower = prd.toLowerCase();
  const metricText = (requirements?.metrics ?? [])
    .map((m) => `${m.name} ${m.description} ${m.entity ?? ''}`)
    .join(' ');
  const combined = `${lower} ${metricText}`;
  const signals = config().requirementSignals;

  const test = (key: keyof typeof signals) => matchesAnyPattern(combined, [signals[key]]);

  return {
    vesselType: detectVesselType(prd),
    voyageInformation: test('voyageInformation'),
    navigationData: test('navigationData'),
    fleetData: test('fleetData'),
    engineData: test('engineData'),
    fuelData: test('fuelData'),
    weatherData: test('weatherData'),
    crewData: test('crewData'),
    cargoData: test('cargoData'),
    complianceData: test('complianceData'),
    safetyData: test('safetyData'),
  };
}

function domainSignalsPresent(rule: ConfigDomainRule, prd: string, requirements?: RequirementAnalysis): boolean {
  const metricText = (requirements?.metrics ?? [])
    .map((m) => `${m.name} ${m.description}`)
    .join(' ');
  const combined = `${prd} ${metricText}`;
  return matchesAnyPattern(combined, rule.metricPatterns);
}

export function analyzeDomainCoverage(
  prd: string,
  existingWidgets: string[],
  requirements?: RequirementAnalysis
): DomainCoverage[] {
  const metricNames = (requirements?.metrics ?? []).map((m) => m.name);

  return config().domainRules.map((rule) => {
    const widgets = existingWidgets.filter((w) => matchesAnyPattern(w, rule.widgetPatterns));
    const metrics = metricNames.filter((m) => matchesAnyPattern(m, rule.metricPatterns));
    const hasSignal = domainSignalsPresent(rule, prd, requirements);
    const covered = widgets.length > 0 || (hasSignal && metrics.length > 0);

    return {
      domain: rule.domain,
      covered,
      widgets,
      metrics,
    };
  });
}

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

function generateMissingFromConfig(
  coverage: DomainCoverage[],
  vesselType: VesselType,
  prd: string
): FeatureRecommendation[] {
  const missing = coverage.filter((c) => !c.covered);
  const domainRecs = missing
    .map((c) => config().domainRules.find((r) => r.domain === c.domain)?.missingFeature)
    .filter((r): r is FeatureRecommendation => Boolean(r));

  const vesselRecs =
    vesselType !== 'General' ? (config().vesselIntelligence[vesselType] ?? []) : [];

  const predictiveRecs = config()
    .predictivePatterns.filter((p) => matchesAnyPattern(prd, [p.pattern]))
    .map((p) => p.feature);

  return dedupeRecommendations(filterByConfidence([...domainRecs, ...vesselRecs, ...predictiveRecs]));
}

export function generateMissingFeatureRecommendations(
  coverage: DomainCoverage[],
  vesselType: VesselType,
  prd: string
): FeatureRecommendation[] {
  return generateMissingFromConfig(coverage, vesselType, prd);
}

export function evaluateDashboardHealth(
  coverage: DomainCoverage[],
  recommendations: FeatureRecommendation[]
): DashboardHealth {
  const allDomains = config().allDomains;
  const coveredCount = coverage.filter((c) => c.covered).length;
  const coverageScore = Math.round((coveredCount / allDomains.length) * 100);

  const domainScore = (domains: MaritimeDomain[]) => {
    const subset = coverage.filter((c) => domains.includes(c.domain));
    if (subset.length === 0) return 0;
    return Math.round((subset.filter((c) => c.covered).length / subset.length) * 100);
  };

  const groups = config().healthDomainGroups;

  return {
    coverageScore,
    navigationCoverage: domainScore(groups.navigationCoverage),
    operationalCoverage: domainScore(groups.operationalCoverage),
    safetyCoverage: domainScore(groups.safetyCoverage),
    complianceCoverage: domainScore(groups.complianceCoverage),
    fleetCoverage: domainScore(groups.fleetCoverage),
    missingCapabilities: coverage.filter((c) => !c.covered).map((c) => c.domain),
    recommendedFeatures: recommendations,
  };
}

export function buildWidgetExplainability(
  selectedWidgets: SelectedWidget[],
  prd: string,
  requirements?: RequirementAnalysis
): WidgetExplainability[] {
  return selectedWidgets.map((w) => {
    const metrics = w.metrics.join(', ') || 'PRD keywords';
    const dataSource = requirements?.metrics
      .filter((m) => w.metrics.includes(m.name))
      .map((m) => m.entity ?? m.name)
      .join(', ') || 'maritime telemetry / PRD specification';

    return {
      widget: w.name,
      generatedBecause: w.reason,
      dataSource,
      confidence: w.confidence,
      businessValue: `${w.visualization} supports ${requirements?.domain ?? 'vessel'} monitoring for ${metrics}`,
    };
  });
}

export function expandWidgetsFromNewFields(
  dataset: Record<string, unknown>,
  existingWidgets: string[],
  domainContext?: string
): { widgets: string[]; recommendations: FeatureRecommendation[] } {
  const result = recommendFromDataset({ dataset, domainContext });
  const newWidgets: string[] = [];
  const recommendations: FeatureRecommendation[] = [];
  const threshold = config().confidenceThreshold;

  for (const rec of result.recommendations) {
    if (rec.confidence <= threshold) continue;
    if (existingWidgets.includes(rec.widget)) continue;

    newWidgets.push(rec.widget);
    recommendations.push({
      feature: rec.visualization,
      widget: rec.widget,
      domain: inferDomainFromField(rec.field),
      businessValue: `Auto-discovered from new field "${rec.field}" — ${rec.classification.monitoringObjective}`,
      priority: rec.priority === 'safety-critical' ? 'critical' : rec.priority === 'operational' ? 'high' : 'medium',
      confidence: rec.confidence,
      reason: rec.reason,
    });
  }

  return { widgets: [...new Set(newWidgets)], recommendations };
}

export function mergeDiscoveredWidgets(
  selected: SelectedWidget[],
  recommendations: FeatureRecommendation[],
  requirements: RequirementAnalysis
): { widgets: SelectedWidget[]; autoExpanded: string[] } {
  const existing = new Set(selected.map((w) => w.name));
  const autoExpanded: string[] = [];
  const merged = [...selected];
  const threshold = config().confidenceThreshold;

  for (const rec of recommendations) {
    if (rec.confidence <= threshold) continue;
    if (existing.has(rec.widget)) continue;

    existing.add(rec.widget);
    autoExpanded.push(rec.widget);
    merged.push({
      name: rec.widget,
      description: rec.feature,
      archetype: resolveWidgetArchetype(rec.widget),
      metrics: [],
      visualization: rec.feature,
      reason: rec.reason,
      confidence: rec.confidence,
      interaction: 'Auto-expanded by BridgeView feature discovery',
      priority: rec.priority === 'critical' ? 'safety-critical' : 'operational',
    });
  }

  if (merged.length === selected.length && selected.length < 3) {
    const defaults = mapWidgets('');
    for (const name of defaults) {
      if (!existing.has(name)) {
        existing.add(name);
        autoExpanded.push(name);
        merged.push({
          name,
          description: `Baseline ${name} for ${requirements.domain}`,
          archetype: resolveWidgetArchetype(name),
          metrics: [],
          visualization: name,
          reason: 'Maritime best-practice baseline widget added for operational coverage',
          confidence: 0.75,
          interaction: 'Standard bridge monitoring',
          priority: 'operational',
        });
      }
    }
  }

  return { widgets: merged, autoExpanded };
}

/** Full BridgeView AI feature discovery pass (config-driven). */
export function runFeatureDiscovery(
  prd: string,
  options: {
    requirements?: RequirementAnalysis;
    selectedWidgets?: SelectedWidget[];
    dataset?: Record<string, unknown>;
  } = {}
): FeatureDiscoveryResult {
  const { requirements, selectedWidgets = [], dataset } = options;

  const reqExtraction = extractRequirements(prd, requirements);
  const widgetNames = [...selectedWidgets.map((w) => w.name), ...mapWidgets(prd)];
  const uniqueWidgets = [...new Set(widgetNames)];

  const domainCoverage = analyzeDomainCoverage(prd, uniqueWidgets, requirements);

  let recommendations = generateMissingFeatureRecommendations(
    domainCoverage,
    reqExtraction.vesselType,
    prd
  );

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

  const widgetExplainability = buildWidgetExplainability(selectedWidgets, prd, requirements);

  return {
    requirements: reqExtraction,
    domainCoverage,
    dashboardHealth,
    vesselTypeRecommendations,
    predictiveFeatures,
    widgetExplainability,
    autoExpandedWidgets,
  };
}

export { inferDomainFromField };
