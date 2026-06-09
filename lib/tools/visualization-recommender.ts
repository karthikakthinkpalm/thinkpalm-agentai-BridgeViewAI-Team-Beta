import type {
  VisualizationAnalysis,
  VisualizationPriority,
  VisualizationRecommendation,
} from '@/lib/types/visualization';
import {
  detectPriorityFromConfig,
  getVisualizationRulesConfig,
  matchesAnyPattern,
  type ConfigFieldRule,
} from './config-loader';
import { recommendFromDataset } from './dataset-viz-agent';
import { mapWidgets } from './widget-mapper';
import { assignDashboardVisualizations, explainVisualization } from './semantic-visualization';

function toRecommendation(rule: ConfigFieldRule): VisualizationRecommendation {
  return {
    dataField: rule.dataField,
    visualization: rule.visualization,
    widget: rule.widget,
    archetype: rule.archetype,
    reason: rule.reason,
    interaction: rule.interaction,
    priority: rule.priority,
  };
}

function ruleMatches(rule: ConfigFieldRule, prd: string): boolean {
  return matchesAnyPattern(prd, rule.patterns);
}

function dedupeRecommendations(recs: VisualizationRecommendation[]): VisualizationRecommendation[] {
  const seenFields = new Set<string>();
  const seenWidgets = new Set<string>();
  return recs.filter((r) => {
    if (seenFields.has(r.dataField) || seenWidgets.has(r.widget)) return false;
    seenFields.add(r.dataField);
    seenWidgets.add(r.widget);
    return true;
  });
}

function applySemanticDiversity(recs: VisualizationRecommendation[]): VisualizationRecommendation[] {
  if (recs.length === 0) return recs;

  const widgetGroups = new Map<string, VisualizationRecommendation[]>();
  for (const r of recs) {
    const group = widgetGroups.get(r.widget) ?? [];
    group.push(r);
    widgetGroups.set(r.widget, group);
  }

  const sections = [...widgetGroups.entries()].map(([widget, group]) => ({
    id: widget,
    widget,
    metrics: group.map((g) => g.dataField),
    text: group.map((g) => g.dataField).join(' '),
  }));

  const assignments = assignDashboardVisualizations(sections);

  return recs.map((r) => {
    const a = assignments.get(r.widget);
    if (!a) return r;
    return {
      ...r,
      visualization: a.visualization,
      archetype: a.archetype,
      reason: explainVisualization(a),
      interaction: a.interaction,
      priority: a.priority,
      semanticDomain: a.domain,
      visualPattern: a.pattern,
    };
  });
}

export function recommendFromConfig(prd: string): VisualizationRecommendation[] {
  const { rules } = getVisualizationRulesConfig();
  const priority = detectPriorityFromConfig(prd);
  const matched = rules.filter((rule) => ruleMatches(rule, prd)).map(toRecommendation);

  const recommendations = dedupeRecommendations(matched).map((r) => ({
    ...r,
    priority: r.priority === 'operational' && priority === 'safety-critical' ? 'safety-critical' : r.priority,
  }));

  const mappedWidgets = mapWidgets(prd);
  for (const widget of mappedWidgets) {
    const alreadyCovered = recommendations.some((r) => r.widget === widget);
    if (!alreadyCovered) {
      const fallback = rules.find((r) => r.widget === widget);
      if (fallback) recommendations.push(toRecommendation(fallback));
    }
  }

  return dedupeRecommendations(recommendations);
}

export function buildAnalysis(prd: string, recommendations: VisualizationRecommendation[]): VisualizationAnalysis {
  const priority = detectPriorityFromConfig(prd);
  const diverse = applySemanticDiversity(recommendations);
  return {
    recommendations: diverse,
    detectedFields: diverse.map((r) => r.dataField),
    priority,
  };
}

/** Sync config-driven visualization recommendations (live preview). */
export function recommendVisualizations(prd: string): VisualizationAnalysis {
  return buildAnalysis(prd, recommendFromConfig(prd));
}

export function recommendationsForWidget(
  widgetName: string,
  analysis: VisualizationAnalysis
): VisualizationRecommendation[] {
  return analysis.recommendations.filter((r) => r.widget === widgetName);
}

export function primaryArchetypeForWidget(
  widgetName: string,
  analysis: VisualizationAnalysis
): string | undefined {
  const recs = recommendationsForWidget(widgetName, analysis);
  if (recs.length === 0) return undefined;
  const safety = recs.find((r) => r.priority === 'safety-critical');
  return (safety ?? recs[0]).archetype;
}

export function formatRecommendationsForPrompt(analysis: VisualizationAnalysis): string {
  if (analysis.recommendations.length === 0) return 'No field-level visualization rules matched.';

  return analysis.recommendations
    .map(
      (r) =>
        `- ${r.dataField} → ${r.visualization} (${r.widget})\n  Reason: ${r.reason}\n  Interaction: ${r.interaction}\n  Priority: ${r.priority}`
    )
    .join('\n');
}

export function recommendationsToJson(analysis: VisualizationAnalysis): object[] {
  return analysis.recommendations.map(({ dataField, visualization, reason, interaction, priority, confidence, widget }) => ({
    dataField,
    visualization,
    widget,
    reason,
    interaction,
    priority,
    ...(confidence !== undefined ? { confidence } : {}),
  }));
}

export function recommendVisualizationsFromDataset(
  dataset: Record<string, unknown>,
  domainContext?: string,
  userGoal?: string
): VisualizationAnalysis {
  const datasetResult = recommendFromDataset({ dataset, domainContext, userGoal });
  const priority = detectPriorityFromConfig(domainContext ?? userGoal ?? '');

  const recommendations: VisualizationRecommendation[] = datasetResult.recommendations.map((r) => ({
    dataField: r.field,
    visualization: r.visualization,
    widget: r.widget,
    archetype: r.archetype,
    reason: r.reason,
    interaction: r.interaction,
    priority: r.priority,
    confidence: r.confidence,
    classification: r.classification,
  }));

  const diverse = applySemanticDiversity(recommendations);

  return {
    recommendations: diverse,
    detectedFields: diverse.map((r) => r.dataField),
    priority,
    monitoringObjective: datasetResult.monitoringObjective,
    domainContext: datasetResult.domainContext,
  };
}

export { recommendFromDataset, recommendField } from './dataset-viz-agent';
