import type {
  VisualizationAnalysis,
  VisualizationPriority,
  VisualizationRecommendation,
} from '@/lib/types/visualization';
import { recommendFromDataset } from './dataset-viz-agent';
import { assignDashboardVisualizations, explainVisualization } from './semantic-visualization';
import { mapWidgets } from './widget-mapper';

interface FieldRule {
  patterns: RegExp[];
  dataField: string;
  visualization: string;
  widget: string;
  archetype: string;
  reason: string;
  interaction: string;
  priority: VisualizationPriority;
}

const FIELD_RULES: FieldRule[] = [
  {
    patterns: [/\b(ais|mmsi|imo|cog|sog|heading|position|latitude|longitude|lat\b|lng\b|coordinates?)\b/i],
    dataField: 'vessel_position_ais',
    visualization: 'Interactive AIS Map + Live Feed',
    widget: 'AISLiveFeed',
    archetype: 'route-map',
    reason: 'Geographic movement data with real-time updates requires an interactive map with AIS layers and position overlays.',
    interaction: 'Pan/zoom map, MMSI lookup, live position refresh',
    priority: 'operational',
  },
  {
    patterns: [/\b(gps|track(ing)?|history|breadcrumb|replay)\b/i],
    dataField: 'gps_track_history',
    visualization: 'GPS Route Tracker',
    widget: 'GPSTracker',
    archetype: 'route-map',
    reason: 'Historical position data is best shown as a geographic track with route replay for temporal analysis.',
    interaction: 'Route replay scrubber, coordinate readout',
    priority: 'operational',
  },
  {
    patterns: [/\b(route|voyage|leg|eta|waypoint|passage|great.?circle)\b/i],
    dataField: 'route_progress',
    visualization: 'Voyage Progress Tracker + Route Map',
    widget: 'VoyageProgressTracker',
    archetype: 'route-map',
    reason: 'Route progress combines geographic and temporal dimensions — a route map with ETA and leg timeline is required.',
    interaction: 'Click legs for detail, hover for ETA/distance remaining',
    priority: 'operational',
  },
  {
    patterns: [/\b(progress|remaining|distance|nm\b|nautical)\b/i],
    dataField: 'voyage_progress_metrics',
    visualization: 'Progress Bar + ETA Countdown',
    widget: 'VoyageProgressTracker',
    archetype: 'route-map',
    reason: 'Progress percentage and distance remaining are KPI-style temporal metrics best paired with a voyage tracker.',
    interaction: 'Progress ring animation, leg stepper',
    priority: 'operational',
  },
  {
    patterns: [/\b(geofence|geofencing|zone|restricted\s+area|port\s+approach)\b/i],
    dataField: 'geofence_zones',
    visualization: 'Geofence Map Overlay',
    widget: 'GPSTracker',
    archetype: 'route-map',
    reason: 'Geofencing is inherently geographic — zones must render as map overlays with breach indicators.',
    interaction: 'Toggle zone layers, alert on boundary crossing',
    priority: 'safety-critical',
  },
  {
    patterns: [/\b(fuel|hfo|mdo|bunker|tank|consumption|burn\s+rate|fill)\b/i],
    dataField: 'fuel_tank_levels',
    visualization: 'Fuel Gauge Cards + Burn Trend',
    widget: 'FuelGaugeCards',
    archetype: 'gauge',
    reason: 'Tank fill levels are comparative KPIs over time — vertical gauges with consumption sparklines enable at-a-glance monitoring.',
    interaction: 'Hover tank for days-remaining detail, trend sparkline',
    priority: 'operational',
  },
  {
    patterns: [/\b(trend|history|over\s+time|24h|timeseries|time.?series)\b/i],
    dataField: 'historical_trend',
    visualization: 'Line / Area Chart',
    widget: 'SensorStreamPanel',
    archetype: 'gauge',
    reason: 'Historical trends require line or area charts to reveal patterns, anomalies, and rate of change.',
    interaction: 'Brush time range, hover crosshair for values',
    priority: 'operational',
  },
  {
    patterns: [/\b(fleet|multi.?vessel|comparison|benchmark|vessels)\b/i],
    dataField: 'fleet_comparison',
    visualization: 'Fleet Performance Heatmap',
    widget: 'KPIDashboard',
    archetype: 'heatmap',
    reason: 'Fleet-wide KPI matrices reveal outliers — heatmaps make underperforming vessels visible at a glance.',
    interaction: 'Hover for vessel/metric values, color scale legend',
    priority: 'informational',
  },
  {
    patterns: [/\b(kpi|cii|efficiency|performance\s+indicator|score)\b/i],
    dataField: 'operational_kpi',
    visualization: 'Bullet Chart',
    widget: 'KPIDashboard',
    archetype: 'bullet-chart',
    reason: 'Scalar KPIs with targets need compact comparison — bullet charts show actual vs target with qualitative bands.',
    interaction: 'Hover qualitative ranges, compare actual vs target',
    priority: 'informational',
  },
  {
    patterns: [/\b(alert|alarm|critical|warning|emergency|incident|acknowledge)\b/i],
    dataField: 'operational_events',
    visualization: 'Incident Timeline',
    widget: 'AlertPanel',
    archetype: 'timeline',
    reason: 'Safety events are temporal sequences — a timeline reveals incident clustering and escalation patterns.',
    interaction: 'Chronological scrub, filter by severity, acknowledge inline',
    priority: 'safety-critical',
  },
  {
    patterns: [/\b(crew|stcw|certification|roster|officer|fatigue|expir)\b/i],
    dataField: 'crew_certification',
    visualization: 'Crew Status List + Badges',
    widget: 'CrewCertificationStatus',
    archetype: 'list',
    reason: 'Crew roster data is hierarchical list data with status badges — a certification panel beats a chart.',
    interaction: 'Filter by expiry, sort by role, status traffic-light',
    priority: 'safety-critical',
  },
  {
    patterns: [/\b(engine|rpm|load|machinery|shaft|temperature|pressure|sensor)\b/i],
    dataField: 'engine_sensors',
    visualization: 'Engine Monitor Gauges',
    widget: 'EngineMonitor',
    archetype: 'gauge',
    reason: 'Machinery sensor readings are real-time scalars — radial or bar gauges with threshold bands are standard bridge UX.',
    interaction: 'Hover for live value, color threshold alerts',
    priority: 'operational',
  },
  {
    patterns: [/\b(weather|wind|wave|swell|sea\s+state|meteo)\b/i],
    dataField: 'weather_conditions',
    visualization: 'Wind Rose',
    widget: 'WeatherWidget',
    archetype: 'wind-rose',
    reason: 'Wind direction and speed are vector data — a wind rose reveals dominant headings that scalar cards cannot.',
    interaction: 'Hover sectors for speed/frequency, toggle Beaufort scale',
    priority: 'informational',
  },
  {
    patterns: [/\b(status|health|operational\s+state|traffic.?light|condition)\b/i],
    dataField: 'vessel_health_status',
    visualization: 'Status Cards + Traffic-Light Indicators',
    widget: 'EngineMonitor',
    archetype: 'kpi',
    reason: 'Vessel health is categorical state data — traffic-light status cards communicate operational readiness instantly.',
    interaction: 'Click status for subsystem detail',
    priority: 'operational',
  },
  {
    patterns: [/\b(workflow|process|step|checklist|procedure|sop)\b/i],
    dataField: 'operational_workflow',
    visualization: 'Process Flow / Step Diagram',
    widget: 'AlertPanel',
    archetype: 'list',
    reason: 'Operational workflows are sequential — step diagrams or ordered checklists show process state better than charts.',
    interaction: 'Step completion toggle, current-step highlight',
    priority: 'operational',
  },
  {
    patterns: [/\b(hierarchy|tree|organization|structure|parent)\b/i],
    dataField: 'hierarchical_structure',
    visualization: 'Hierarchical Tree Diagram',
    widget: 'CrewCertificationStatus',
    archetype: 'list',
    reason: 'Hierarchical relationships require tree or nested list layouts to preserve parent-child context.',
    interaction: 'Expand/collapse nodes, select branch',
    priority: 'informational',
  },
  {
    patterns: [/\b(stream|telemetry|real.?time|live\s+data|mqtt)\b/i],
    dataField: 'live_sensor_stream',
    visualization: 'Live Sensor Stream Panel',
    widget: 'SensorStreamPanel',
    archetype: 'gauge',
    reason: 'Real-time telemetry streams need a live-updating panel with sparklines rather than static snapshots.',
    interaction: 'Auto-refresh stream, pause/resume, value tooltips',
    priority: 'operational',
  },
];

function detectPriority(prd: string): VisualizationPriority {
  const lower = prd.toLowerCase();
  if (/safety|critical|emergency|steering|collision|mayday/.test(lower)) return 'safety-critical';
  if (/informational|report|analytics|fleet\s+overview/.test(lower)) return 'informational';
  return 'operational';
}

function ruleMatches(rule: FieldRule, prd: string): boolean {
  return rule.patterns.some((p) => p.test(prd));
}

function toRecommendation(rule: FieldRule): VisualizationRecommendation {
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

/** Apply semantic domain rules and enforce visual diversity across dashboard sections. */
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

/** Analyze PRD and produce field-level visualization recommendations with justification. */
export function recommendVisualizations(prd: string): VisualizationAnalysis {
  const priority = detectPriority(prd);
  const matched = FIELD_RULES.filter((rule) => ruleMatches(rule, prd)).map(toRecommendation);

  const recommendations = dedupeRecommendations(matched).map((r) => ({
    ...r,
    priority: r.priority === 'operational' && priority === 'safety-critical' ? 'safety-critical' : r.priority,
  }));

  const detectedFields = recommendations.map((r) => r.dataField);

  // Ensure mapper widgets without explicit field hits still get a recommendation
  const mappedWidgets = mapWidgets(prd);
  for (const widget of mappedWidgets) {
    const alreadyCovered = recommendations.some((r) => r.widget === widget);
    if (!alreadyCovered) {
      const fallback = FIELD_RULES.find((r) => r.widget === widget);
      if (fallback) {
        recommendations.push(toRecommendation(fallback));
        detectedFields.push(fallback.dataField);
      }
    }
  }

  const diverse = applySemanticDiversity(dedupeRecommendations(recommendations));
  return { recommendations: diverse, detectedFields, priority };
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

/** Merge PRD keyword rules with structured dataset analysis when JSON fields are embedded in PRD. */
export function recommendVisualizationsFromDataset(
  dataset: Record<string, unknown>,
  domainContext?: string,
  userGoal?: string
): VisualizationAnalysis {
  const datasetResult = recommendFromDataset({ dataset, domainContext, userGoal });
  const priority = detectPriority(domainContext ?? userGoal ?? '');

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
