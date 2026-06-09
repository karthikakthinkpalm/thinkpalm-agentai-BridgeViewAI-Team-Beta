import { runAgent1RequirementAnalyzer } from '@/lib/agents/agent1-requirement-analyzer';
import { runAgent2DataClassifier } from '@/lib/agents/agent2-data-classifier';
import { runAgent3VisualizationSelector } from '@/lib/agents/agent3-visualization-selector';
import { runAgent4LayoutPlanner } from '@/lib/agents/agent4-layout-planner';
import { runAgent5ReactGenerator } from '@/lib/agents/agent5-react-generator';
import { runAgent6UXReviewer } from '@/lib/agents/agent6-ux-reviewer';
import { runAgent7MaritimeExpert } from '@/lib/agents/agent7-maritime-expert';
import { runBridgeViewIntelligence } from '@/lib/agents/bridgeview-intelligence';
import { provisionToolsForPrd } from './tool-provisioner';
import { registerAgent } from './registry';
import { buildSchema } from './schema-builder';

export function registerPipelineAgents(): void {
  registerAgent({
    id: 'requirement_analyzer',
    displayName: 'AGENT 1',
    description: 'Parse the PRD and extract domain, entities, metrics, and priority.',
    requires: ['prd'],
    produces: ['requirements', 'detectedWidgets'],
    async run(ctx) {
      const result = await runAgent1RequirementAnalyzer(ctx.prd);
      ctx.requirements = result.requirements;
      ctx.detectedWidgets = result.detectedWidgets;
      ctx.prompts.push(...result.prompts);
      return {
        summary: `${result.requirements.metrics.length} metrics, ${result.requirements.entities.length} entities`,
        status: 'done',
      };
    },
  });

  registerAgent({
    id: 'tool_provisioner',
    displayName: 'TOOL PROVISIONER',
    description:
      'Analyze PRD requirements and dynamically register additional tools (catalog + LLM) not in the baseline plan.',
    requires: ['requirements'],
    produces: [],
    async run(ctx) {
      if (!ctx.plan || !ctx.requirements) {
        return { summary: 'Skipped — no plan or requirements', status: 'skipped' };
      }
      const { added, plan } = await provisionToolsForPrd(ctx.prd, ctx.requirements, ctx.plan);
      ctx.plan = plan;
      ctx.provisionedTools = [...(ctx.provisionedTools ?? []), ...added];
      const names = added.map((t) => t.id).join(', ') || 'none';
      return {
        summary: `Provisioned ${added.length} tool(s): ${names}`,
        status: added.length > 0 ? 'done' : 'noop',
      };
    },
  });

  registerAgent({
    id: 'data_classifier',
    displayName: 'AGENT 2',
    description: 'Classify extracted metrics into Spatial, Temporal, KPI, Event, Comparison, or Hierarchical categories.',
    requires: ['requirements'],
    produces: ['classifiedMetrics'],
    async run(ctx) {
      const result = runAgent2DataClassifier(ctx.requirements!);
      ctx.classifiedMetrics = result.classifiedMetrics;
      ctx.prompts.push(...result.prompts);
      return {
        summary: `${result.classifiedMetrics.length} metrics classified`,
        status: 'done',
      };
    },
  });

  registerAgent({
    id: 'visualization_selector',
    displayName: 'AGENT 3',
    description: 'Map classified metrics to maritime widgets and visualization archetypes.',
    requires: ['requirements', 'classifiedMetrics'],
    produces: ['selectedWidgets'],
    async run(ctx) {
      const result = runAgent3VisualizationSelector(ctx.requirements!, ctx.classifiedMetrics!);
      ctx.selectedWidgets = result.selectedWidgets;
      ctx.prompts.push(...result.prompts);
      return {
        summary: `${result.selectedWidgets.length} widgets selected`,
        status: 'done',
      };
    },
  });

  registerAgent({
    id: 'bridgeview_intelligence',
    displayName: 'BRIDGEVIEW',
    description: 'Run feature discovery, domain coverage analysis, and auto-expand missing widgets.',
    requires: ['prd', 'requirements', 'selectedWidgets'],
    produces: ['enrichedWidgets', 'discovery'],
    async run(ctx) {
      const result = await runBridgeViewIntelligence(ctx.prd, ctx.requirements!, ctx.selectedWidgets!);
      ctx.discovery = result.discovery;
      ctx.enrichedWidgets = result.enrichedWidgets;
      ctx.autoExpandedWidgets = result.autoExpandedWidgets;
      ctx.prompts.push(...result.prompts);
      return {
        summary: `Coverage ${result.discovery.dashboardHealth.coverageScore}% · ${result.autoExpandedWidgets.length} auto-expanded`,
        status: 'done',
      };
    },
  });

  registerAgent({
    id: 'layout_planner',
    displayName: 'AGENT 4',
    description: 'Plan dashboard layout zones and widget placement for bridge UX.',
    requires: ['requirements', 'enrichedWidgets'],
    produces: ['layoutPlan'],
    async run(ctx) {
      const result = runAgent4LayoutPlanner(ctx.requirements!, ctx.enrichedWidgets!);
      ctx.layoutPlan = result.layoutPlan;
      ctx.prompts.push(...result.prompts);
      return {
        summary: `Layout: ${result.layoutPlan.pattern}`,
        status: 'done',
      };
    },
  });

  registerAgent({
    id: 'schema_builder',
    displayName: 'SCHEMA',
    description: 'Assemble the final ParsedSchema from requirements, widgets, layout, and visualization analysis.',
    requires: ['requirements', 'classifiedMetrics', 'enrichedWidgets', 'layoutPlan', 'visualizationAnalysis'],
    produces: ['schema'],
    async run(ctx) {
      const schema = buildSchema(
        { requirements: ctx.requirements! },
        { classifiedMetrics: ctx.classifiedMetrics!, prompts: [] },
        { selectedWidgets: ctx.enrichedWidgets!, prompts: [] },
        { layoutPlan: ctx.layoutPlan!, prompts: [] },
        ctx.visualizationAnalysis!,
        ctx.enrichedWidgets!
      );
      ctx.schema = schema;
      return {
        summary: `${schema.widgets.length} widgets in schema`,
        status: 'done',
      };
    },
  });

  registerAgent({
    id: 'react_generator',
    displayName: 'AGENT 5',
    description: 'Generate production React TSX components for each widget in the schema.',
    requires: ['schema'],
    produces: ['components'],
    async run(ctx) {
      const result = await runAgent5ReactGenerator(ctx.schema!);
      ctx.components = result.components;
      ctx.fallbackWidgets = result.fallbackWidgets;
      ctx.warnings.push(...result.warnings);
      ctx.prompts.push(...result.prompts);
      const status = result.fallbackWidgets.length > 0 ? 'fallback' : 'done';
      const summary =
        result.fallbackWidgets.length > 0
          ? `${Object.keys(result.components).length} components (${result.fallbackWidgets.length} curated templates)`
          : `${Object.keys(result.components).length} components generated`;
      return { summary, status };
    },
  });

  registerAgent({
    id: 'ux_reviewer',
    displayName: 'AGENT 6',
    description: 'Validate generated components for UX, accessibility, and visualization fidelity.',
    requires: ['components', 'enrichedWidgets'],
    produces: ['uxReview'],
    async run(ctx) {
      const result = runAgent6UXReviewer(ctx.components!, ctx.enrichedWidgets!);
      ctx.uxReview = result.uxReview;
      ctx.prompts.push(...result.prompts);
      return {
        summary: result.uxReview.summary,
        status: result.uxReview.passed ? 'passed' : 'warn',
      };
    },
  });

  registerAgent({
    id: 'maritime_expert',
    displayName: 'AGENT 7',
    description: 'Review maritime domain coverage, safety widgets, and terminology.',
    requires: ['requirements', 'enrichedWidgets', 'components'],
    produces: ['maritimeReview'],
    async run(ctx) {
      const result = runAgent7MaritimeExpert(ctx.requirements!, ctx.enrichedWidgets!, ctx.components!);
      ctx.maritimeReview = result.maritimeReview;
      ctx.prompts.push(...result.prompts);
      return {
        summary: result.maritimeReview.summary,
        status: result.maritimeReview.approved ? 'approved' : 'review',
      };
    },
  });
}
