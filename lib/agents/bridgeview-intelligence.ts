import { mergeDiscoveredWidgets } from '../tools/feature-discovery';
import { runFeatureDiscoveryAsync } from '../tools/feature-discovery.server';
import type { FeatureDiscoveryResult } from '../types/feature-discovery';
import type { RequirementAnalysis, SelectedWidget } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';

export interface BridgeViewIntelligenceResult {
  discovery: FeatureDiscoveryResult;
  enrichedWidgets: SelectedWidget[];
  autoExpandedWidgets: string[];
  prompts: PromptRecord[];
  recommendationSource?: 'config' | 'llm';
}

/** BridgeView AI — config-driven feature discovery with LLM fallback. */
export async function runBridgeViewIntelligence(
  prd: string,
  requirements: RequirementAnalysis,
  selectedWidgets: SelectedWidget[],
  provider?: 'groq' | 'gemini'
): Promise<BridgeViewIntelligenceResult> {
  const discovery = await runFeatureDiscoveryAsync(prd, {
    requirements,
    selectedWidgets,
  }, provider);

  const allRecommendations = [
    ...discovery.dashboardHealth.recommendedFeatures,
    ...discovery.vesselTypeRecommendations,
  ];

  const { widgets: enrichedWidgets, autoExpanded } = mergeDiscoveredWidgets(
    selectedWidgets,
    allRecommendations,
    requirements
  );

  const prompts: PromptRecord[] = [
    {
      id: 'bv-discovery',
      agent: 'BRIDGEVIEW',
      role: 'system',
      label: 'Feature Discovery — Domain Coverage',
      content: JSON.stringify(
        {
          vesselType: discovery.requirements.vesselType,
          coverageScore: discovery.dashboardHealth.coverageScore,
          missingCapabilities: discovery.dashboardHealth.missingCapabilities,
          autoExpanded,
          recommendationSource: discovery.recommendationSource ?? 'config',
        },
        null,
        2
      ),
      techniques: [
        'Config-driven domain rules',
        'LLM fallback for sparse matches',
        'Vessel-type intelligence',
        'Autonomous widget expansion',
      ],
    },
    {
      id: 'bv-recommendations',
      agent: 'BRIDGEVIEW',
      role: 'system',
      label: 'Feature Discovery — Recommendations',
      content: allRecommendations
        .filter((r) => r.confidence > 0.7)
        .map(
          (r) =>
            `${r.feature} (${r.widget})\n  Domain: ${r.domain} · Priority: ${r.priority} · Confidence: ${r.confidence}\n  Value: ${r.businessValue}\n  Reason: ${r.reason}`
        )
        .join('\n\n'),
      techniques: ['Maritime best practices', 'Predictive feature discovery', 'Business value scoring'],
    },
  ];

  return {
    discovery,
    enrichedWidgets,
    autoExpandedWidgets: [...new Set([...autoExpanded, ...discovery.autoExpandedWidgets])],
    prompts,
    recommendationSource: discovery.recommendationSource,
  };
}
