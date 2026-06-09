import { runAgent2DataClassifier } from '@/lib/agents/agent2-data-classifier';
import { runAgent3VisualizationSelector } from '@/lib/agents/agent3-visualization-selector';
import { runAgent4LayoutPlanner } from '@/lib/agents/agent4-layout-planner';
import { runAgent6UXReviewer } from '@/lib/agents/agent6-ux-reviewer';
import { runAgent7MaritimeExpert } from '@/lib/agents/agent7-maritime-expert';
import { recommendVisualizations } from '@/lib/tools/visualization-recommender';
import { mapWidgets } from '@/lib/tools/widget-mapper';
import type { MaritimeReviewResult, UXReviewResult } from '@/lib/types/pipeline';
import type { PipelineContext } from './types';

function isSkippedOrUnplanned(ctx: PipelineContext, agentId: string): boolean {
  if (!ctx.plan) return false;
  if (ctx.plan.skipped.some((s) => s.id === agentId)) return true;
  return !ctx.plan.agents.includes(agentId);
}

function defaultUxReview(): UXReviewResult {
  return {
    passed: true,
    score: 100,
    issues: [],
    summary: 'UX review skipped — not required for this PRD profile',
  };
}

function defaultMaritimeReview(): MaritimeReviewResult {
  return {
    approved: true,
    score: 100,
    findings: ['Maritime expert review skipped — PRD did not require domain validation'],
    summary: 'Maritime review skipped (adaptive pipeline)',
  };
}

/** Fill pipeline context when an adaptive plan skipped an upstream agent. */
export function applyStubsForContext(ctx: PipelineContext): void {
  if (!ctx.requirements) return;

  if (!ctx.classifiedMetrics?.length && isSkippedOrUnplanned(ctx, 'data_classifier')) {
    const a2 = runAgent2DataClassifier(ctx.requirements);
    ctx.classifiedMetrics = a2.classifiedMetrics;
  }

  if (!ctx.selectedWidgets?.length && isSkippedOrUnplanned(ctx, 'visualization_selector')) {
    const widgets = mapWidgets(ctx.prd);
    if (ctx.classifiedMetrics?.length) {
      const a3 = runAgent3VisualizationSelector(ctx.requirements, ctx.classifiedMetrics);
      ctx.selectedWidgets = a3.selectedWidgets.length > 0 ? a3.selectedWidgets : widgets.map(stubWidget(ctx));
    } else {
      ctx.selectedWidgets = widgets.map(stubWidget(ctx));
    }
  }

  if (!ctx.enrichedWidgets?.length && isSkippedOrUnplanned(ctx, 'bridgeview_intelligence')) {
    ctx.enrichedWidgets = ctx.selectedWidgets ?? [];
  }

  if (!ctx.layoutPlan && isSkippedOrUnplanned(ctx, 'layout_planner') && ctx.enrichedWidgets?.length) {
    const a4 = runAgent4LayoutPlanner(ctx.requirements, ctx.enrichedWidgets);
    ctx.layoutPlan = a4.layoutPlan;
  }

  if (!ctx.visualizationAnalysis && !ctx.plan?.tools.includes('recommend_visualizations')) {
    ctx.visualizationAnalysis = recommendVisualizations(ctx.prd);
  }
}

function stubWidget(ctx: PipelineContext) {
  return (name: string) => ({
    name,
    description: `Widget for ${ctx.requirements!.domain}`,
    archetype: 'card',
    metrics: [],
    visualization: name,
    reason: 'Stubbed from PRD keyword mapping',
    confidence: 0.75,
    interaction: '',
    priority: ctx.requirements!.priority,
  });
}

export function applyReviewStubs(ctx: PipelineContext): void {
  if (!ctx.uxReview && ctx.components) {
    if (ctx.plan?.agents.includes('ux_reviewer')) {
      const result = runAgent6UXReviewer(ctx.components, ctx.enrichedWidgets ?? []);
      ctx.uxReview = result.uxReview;
    } else {
      ctx.uxReview = defaultUxReview();
    }
  }

  if (!ctx.maritimeReview && ctx.components && ctx.requirements) {
    if (ctx.plan?.agents.includes('maritime_expert')) {
      const result = runAgent7MaritimeExpert(
        ctx.requirements,
        ctx.enrichedWidgets ?? [],
        ctx.components
      );
      ctx.maritimeReview = result.maritimeReview;
    } else {
      ctx.maritimeReview = defaultMaritimeReview();
    }
  }
}

export function recordSkippedCapabilities(ctx: PipelineContext): void {
  for (const skip of ctx.plan?.skipped ?? []) {
    if (ctx.completedCapabilities.has(skip.id)) continue;
    ctx.completedCapabilities.add(skip.id);
    ctx.agentTrace.push({
      agent: skip.id.toUpperCase().replace(/_/g, ' '),
      status: 'skipped',
      detail: skip.reason,
    });
  }
}
