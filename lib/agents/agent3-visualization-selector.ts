import type { ClassifiedMetric, MetricCategory, RequirementAnalysis, SelectedWidget } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';
import {
  assignDashboardVisualizations,
  detectSemanticDomain,
  explainVisualization,
  validateVisualDiversity,
} from '../tools/semantic-visualization';

const METRIC_WIDGET_OVERRIDE: Record<string, string> = {
  position: 'AISLiveFeed',
  route_progress: 'VoyageProgressTracker',
  fuel_level: 'FuelGaugeCards',
  mdo_level: 'FuelGaugeCards',
  engine_rpm: 'EngineMonitor',
  weather: 'WeatherWidget',
  alerts: 'AlertPanel',
  crew_certs: 'CrewCertificationStatus',
  kpi_efficiency: 'KPIDashboard',
  speed: 'SensorStreamPanel',
  course: 'GPSTracker',
};

const CATEGORY_WIDGET: Record<MetricCategory, string> = {
  Spatial: 'VoyageProgressTracker',
  Temporal: 'SensorStreamPanel',
  KPI: 'FuelGaugeCards',
  Event: 'AlertPanel',
  Comparison: 'KPIDashboard',
  Hierarchical: 'CrewCertificationStatus',
};

export interface Agent3Result {
  selectedWidgets: SelectedWidget[];
  prompts: PromptRecord[];
}

export function runAgent3VisualizationSelector(
  requirements: RequirementAnalysis,
  classifiedMetrics: ClassifiedMetric[]
): Agent3Result {
  const widgetGroups = new Map<string, { metrics: ClassifiedMetric[]; primary: MetricCategory }>();

  for (const m of classifiedMetrics) {
    // Dynamically generate the widget name from the entity (e.g., "berth_management" -> "BerthManagement")
    let widgetName = '';
    if (m.entity && m.entity.trim().length > 0) {
      widgetName = m.entity
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
    }

    // Fallback to hardcoded generics only if no entity was extracted
    if (!widgetName) {
      widgetName = METRIC_WIDGET_OVERRIDE[m.name] ?? CATEGORY_WIDGET[m.primaryCategory] ?? 'GenericWidget';
    }

    const existing = widgetGroups.get(widgetName);
    if (existing) {
      existing.metrics.push(m);
    } else {
      widgetGroups.set(widgetName, { metrics: [m], primary: m.primaryCategory });
    }
  }

  const draftWidgets: SelectedWidget[] = [...widgetGroups.entries()].map(([name, group]) => {
    const avgConf = group.metrics.reduce((s, m) => s + m.confidence, 0) / group.metrics.length;
    const metricNames = group.metrics.map((m) => m.name);
    const metricDetails = group.metrics.map((m) => m.description).join('; ');
    const context = `${metricNames.join(' ')} ${requirements.domain}`;
    const domain = detectSemanticDomain(context, name);

    return {
      name,
      description: `Dashboard widget to display and monitor: ${metricDetails}. Context: ${requirements.userGoal || requirements.domain}.`,
      archetype: 'pending',
      metrics: metricNames,
      visualization: 'pending',
      reason: `${domain} domain metrics (${metricNames.join(', ')}) require semantically distinct visualization.`,
      confidence: Math.round(avgConf * 100) / 100,
      interaction: '',
      priority: requirements.priority,
    };
  });

  const sections = draftWidgets.map((w) => ({
    id: w.name,
    widget: w.name,
    metrics: w.metrics,
    text: `${w.metrics.join(' ')} ${requirements.domain} ${requirements.userGoal}`,
  }));

  const assignments = assignDashboardVisualizations(sections);

  const selectedWidgets: SelectedWidget[] = draftWidgets.map((w) => {
    const assignment = assignments.get(w.name);
    if (!assignment) return w;

    return {
      ...w,
      visualization: assignment.visualization,
      archetype: assignment.archetype,
      reason: explainVisualization(assignment),
      interaction: assignment.interaction,
      priority:
        assignment.priority === 'safety-critical' ? 'safety-critical' : w.priority,
    };
  });

  const diversityCheck = validateVisualDiversity([...assignments.values()]);
  const diversityNote = diversityCheck.valid
    ? 'Visual diversity verified — no duplicate patterns across domains.'
    : `Diversity warnings: ${diversityCheck.conflicts.join('; ')}`;

  const prompts: PromptRecord[] = [
    {
      id: 'a3-selection',
      agent: 'AGENT 3',
      role: 'system',
      label: 'Visualization Selector — Semantic Mapping',
      content: [
        ...selectedWidgets.map(
          (w) => {
            const a = assignments.get(w.name);
            return `${w.name}: ${w.visualization}\n  Domain: ${a?.domain ?? 'unknown'}\n  Pattern: ${a?.pattern ?? 'unknown'}\n  Metrics: ${w.metrics.join(', ')}\n  Reason: ${w.reason}\n  Confidence: ${w.confidence}`;
          }
        ),
        '',
        diversityNote,
      ].join('\n\n'),
      techniques: [
        'Semantic domain visualization',
        'Cross-section visual diversity',
        'Charts/maps/timelines over KPI cards',
        'Per-section justification',
      ],
    },
  ];

  return { selectedWidgets, prompts };
}
