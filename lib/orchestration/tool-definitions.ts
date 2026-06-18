import { runFeatureDiscoveryAsync } from '@/lib/tools/feature-discovery.server';
import { recommendVisualizationsAsync } from '@/lib/tools/visualization-recommender.server';
import { mapWidgetsAsync } from '@/lib/tools/widget-mapper.server';
import { getDesignSystemTemplate } from '@/lib/tools/widget-design-system.server';
import { registerTool } from './registry';

export function registerPipelineTools(): void {
  registerTool({
    id: 'map_widgets',
    description: 'Map PRD text to maritime widgets (config rules + LLM fallback).',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'PRD or requirement text to scan for widget keywords' },
      },
      required: ['text'],
    },
    async run(args, ctx) {
      const text = String(args.text ?? '');
      const { widgets, source } = await mapWidgetsAsync(text, ctx.llmProvider);
      return { widgets, source };
    },
  });

  registerTool({
    id: 'recommend_visualizations',
    description: 'Recommend chart/map/gauge visualizations per data field (config + LLM fallback).',
    parameters: {
      type: 'object',
      properties: {
        prd: { type: 'string', description: 'Product requirements document text' },
      },
      required: ['prd'],
    },
    async run(args, ctx) {
      const prd = String(args.prd ?? ctx.prd);
      const analysis = await recommendVisualizationsAsync(prd, ctx.llmProvider);
      ctx.visualizationAnalysis = analysis;
      return {
        recommendationCount: analysis.recommendations.length,
        widgets: [...new Set(analysis.recommendations.map((r) => r.widget))],
        source: analysis.source,
      };
    },
  });

  registerTool({
    id: 'get_design_system_template',
    description: 'Fetch Tailwind structural JSON for a widget archetype (config + LLM for unknown types).',
    parameters: {
      type: 'object',
      properties: {
        archetype: { type: 'string', description: 'Widget archetype key' },
      },
      required: ['archetype'],
    },
    async run(args) {
      const archetype = String(args.archetype ?? 'card');
      const template = await getDesignSystemTemplate(archetype);
      return { template };
    },
  });

  registerTool({
    id: 'feature_discovery',
    description: 'Maritime domain coverage analysis (config rules + LLM fallback).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    async run(_args, ctx) {
      if (!ctx.requirements || !ctx.selectedWidgets) {
        return { error: 'requirements and selectedWidgets must exist — run requirement_analyzer and visualization_selector first' };
      }
      const discovery = await runFeatureDiscoveryAsync(ctx.prd, {
        requirements: ctx.requirements,
        selectedWidgets: ctx.selectedWidgets,
      });
      return {
        coverageScore: discovery.dashboardHealth.coverageScore,
        recommendedFeatures: discovery.dashboardHealth.recommendedFeatures.length,
        missingCapabilities: discovery.dashboardHealth.missingCapabilities,
        source: discovery.recommendationSource ?? 'config',
      };
    },
  });
}
