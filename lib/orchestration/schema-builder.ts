import type { VisualizationAnalysis } from '@/lib/types/visualization';
import type {
  Agent1Result,
} from '@/lib/agents/agent1-requirement-analyzer';
import type { Agent2Result } from '@/lib/agents/agent2-data-classifier';
import type { Agent3Result } from '@/lib/agents/agent3-visualization-selector';
import type { Agent4Result } from '@/lib/agents/agent4-layout-planner';
import type { ParsedSchema, WidgetDefinition } from '@/lib/types/pipeline';

export function buildSchema(
  a1: Pick<Agent1Result, 'requirements'>,
  classified: Agent2Result,
  selected: Agent3Result,
  layout: Agent4Result,
  vizAnalysis: VisualizationAnalysis,
  enrichedWidgets: Agent3Result['selectedWidgets']
): ParsedSchema {
  const placementMap = new Map(layout.layoutPlan.placements.map((p) => [p.widget, p]));

  const widgets: WidgetDefinition[] = enrichedWidgets.map((sw) => {
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
    selectedWidgets: enrichedWidgets,
    layoutPlan: layout.layoutPlan,
  };
}
