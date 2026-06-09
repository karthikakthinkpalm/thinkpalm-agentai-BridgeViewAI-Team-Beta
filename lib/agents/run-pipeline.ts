import { clearRegistry } from '../tools/registry';
import { recommendVisualizations } from '../tools/visualization-recommender';
import { buildWidgetHierarchy } from '../preview/hierarchy';
import type { PipelineResult, ParsedSchema, WidgetDefinition } from '../types/pipeline';
import { runAgent1RequirementAnalyzer, type Agent1Result } from './agent1-requirement-analyzer';
import type { Agent2Result } from './agent2-data-classifier';
import type { Agent3Result } from './agent3-visualization-selector';
import type { Agent4Result } from './agent4-layout-planner';
import { runAgent2DataClassifier } from './agent2-data-classifier';
import { runAgent3VisualizationSelector } from './agent3-visualization-selector';
import { runAgent4LayoutPlanner } from './agent4-layout-planner';
import { runAgent5ReactGenerator } from './agent5-react-generator';
import { runAgent6UXReviewer } from './agent6-ux-reviewer';
import { runAgent7MaritimeExpert } from './agent7-maritime-expert';
import { runBridgeViewIntelligence } from './bridgeview-intelligence';

function buildSchema(
  a1: Agent1Result,
  classified: Agent2Result,
  selected: Agent3Result,
  layout: Agent4Result,
  vizAnalysis: ReturnType<typeof recommendVisualizations>
): ParsedSchema {
  const placementMap = new Map(layout.layoutPlan.placements.map((p) => [p.widget, p]));

  const widgets: WidgetDefinition[] = selected.selectedWidgets.map((sw) => {
    const placement = placementMap.get(sw.name);
    const vizRecs = vizAnalysis.recommendations.filter((r) => r.widget === sw.name);
    return {
      name: sw.name,
      description: `${sw.description}. ${sw.reason}`,
      archetype: sw.archetype,
      recommendations: vizRecs.length > 0 ? vizRecs : undefined,
      zone: placement?.zone,
      layoutOrder: placement?.order,
    };
  });

  return {
    domain: a1.requirements.domain,
    priority: a1.requirements.priority,
    layout: layout.layoutPlan.pattern,
    widgets,
    requirements: a1.requirements,
    classifiedMetrics: classified.classifiedMetrics,
    selectedWidgets: selected.selectedWidgets,
    layoutPlan: layout.layoutPlan,
  };
}

export async function runPipeline(prd: string): Promise<PipelineResult & { hierarchy: ReturnType<typeof buildWidgetHierarchy> }> {
  clearRegistry();
  const agentTrace: PipelineResult['agentTrace'] = [];

  console.log('Agent 1: Requirement Analyzer...');
  const a1 = await runAgent1RequirementAnalyzer(prd);
  agentTrace.push({ agent: 'AGENT 1', status: 'done', detail: `${a1.requirements.metrics.length} metrics, ${a1.requirements.entities.length} entities` });

  console.log('Agent 2: Data Classifier...');
  const a2 = runAgent2DataClassifier(a1.requirements);
  agentTrace.push({ agent: 'AGENT 2', status: 'done', detail: `${a2.classifiedMetrics.length} metrics classified` });

  console.log('Agent 3: Visualization Selector...');
  const a3 = runAgent3VisualizationSelector(a1.requirements, a2.classifiedMetrics);
  agentTrace.push({ agent: 'AGENT 3', status: 'done', detail: `${a3.selectedWidgets.length} widgets selected` });

  console.log('BridgeView: Feature Discovery...');
  const bv = runBridgeViewIntelligence(prd, a1.requirements, a3.selectedWidgets);
  const enrichedWidgets = bv.enrichedWidgets;
  agentTrace.push({
    agent: 'BRIDGEVIEW',
    status: 'done',
    detail: `Coverage ${bv.discovery.dashboardHealth.coverageScore}% · ${bv.autoExpandedWidgets.length} auto-expanded · ${bv.discovery.dashboardHealth.recommendedFeatures.length} recommendations`,
  });

  console.log('Agent 4: Layout Planner...');
  const a4 = runAgent4LayoutPlanner(a1.requirements, enrichedWidgets);
  agentTrace.push({ agent: 'AGENT 4', status: 'done', detail: `Layout: ${a4.layoutPlan.pattern}` });

  const visualizationAnalysis = recommendVisualizations(prd);
  const a3Enriched = { ...a3, selectedWidgets: enrichedWidgets };
  const schema = buildSchema(a1, a2, a3Enriched, a4, visualizationAnalysis);

  console.log('Agent 5: React Generator...');
  const a5 = await runAgent5ReactGenerator(schema);
  const a5Status = a5.fallbackWidgets.length > 0 ? 'fallback' : 'done';
  const a5Detail =
    a5.fallbackWidgets.length > 0
      ? `${Object.keys(a5.components).length} components (${a5.fallbackWidgets.length} curated templates — LLM rate limited)`
      : `${Object.keys(a5.components).length} components generated`;
  agentTrace.push({ agent: 'AGENT 5', status: a5Status, detail: a5Detail });

  console.log('Agent 6: UX Reviewer...');
  const a6 = runAgent6UXReviewer(a5.components, enrichedWidgets);
  agentTrace.push({ agent: 'AGENT 6', status: a6.uxReview.passed ? 'passed' : 'warn', detail: a6.uxReview.summary });

  console.log('Agent 7: Maritime Expert...');
  const a7 = runAgent7MaritimeExpert(a1.requirements, enrichedWidgets, a5.components);
  agentTrace.push({ agent: 'AGENT 7', status: a7.maritimeReview.approved ? 'approved' : 'review', detail: a7.maritimeReview.summary });

  const hierarchy = buildWidgetHierarchy(schema);
  const prompts = [
    ...a1.prompts,
    ...a2.prompts,
    ...a3.prompts,
    ...bv.prompts,
    ...a4.prompts,
    ...a5.prompts,
    ...a6.prompts,
    ...a7.prompts,
  ];

  const tree = Object.keys(a5.components);

  return {
    schema,
    components: a5.components,
    tree,
    hierarchy,
    prompts,
    detectedWidgets: a1.detectedWidgets,
    visualizationAnalysis,
    featureDiscovery: bv.discovery,
    uxReview: a6.uxReview,
    maritimeReview: a7.maritimeReview,
    agentTrace,
    warnings: a5.warnings,
  };
}

// Re-export types for backwards compatibility
export type { ParsedSchema, WidgetDefinition } from '../types/pipeline';
