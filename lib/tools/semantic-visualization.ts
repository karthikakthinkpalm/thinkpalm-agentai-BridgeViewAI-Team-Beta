import type { VisualizationPriority } from '@/lib/types/visualization';

/** Maritime data domains — each has exclusive visualization patterns. */
export type SemanticDomain =
  | 'Weather'
  | 'Navigation'
  | 'OperationalKPI'
  | 'Sustainability'
  | 'Alerts'
  | 'Fleet'
  | 'Machinery'
  | 'Crew';

/** Distinct visualization patterns — never reused across different domains. */
export type VisualizationPattern =
  | 'wind-rose'
  | 'weather-map'
  | 'weather-heatmap'
  | 'weather-area-chart'
  | 'interactive-map'
  | 'route-timeline'
  | 'voyage-tracker'
  | 'circular-progress'
  | 'bullet-chart'
  | 'sparkline'
  | 'kpi-card'
  | 'grade-indicator'
  | 'emission-trend'
  | 'carbon-gauge'
  | 'alert-timeline'
  | 'severity-chart'
  | 'incident-heatmap'
  | 'comparison-table'
  | 'fleet-heatmap'
  | 'bubble-chart'
  | 'machinery-gauge'
  | 'sensor-stream'
  | 'crew-hierarchy';

export interface VisualizationSpec {
  pattern: VisualizationPattern;
  domain: SemanticDomain;
  label: string;
  archetype: string;
  widget: string;
  interaction: string;
  priority: VisualizationPriority;
  /** Higher = preferred over simple KPI cards (charts/maps/timelines rank 80+). */
  richness: number;
  reason: string;
}

const DOMAIN_PATTERNS: Record<SemanticDomain, VisualizationSpec[]> = {
  Weather: [
    {
      pattern: 'wind-rose',
      domain: 'Weather',
      label: 'Wind Rose',
      archetype: 'wind-rose',
      widget: 'WeatherWidget',
      interaction: 'Hover sectors for speed/frequency, toggle Beaufort scale',
      priority: 'informational',
      richness: 92,
      reason: 'Wind direction and speed are angular-vector data — a wind rose reveals dominant headings and gust patterns that scalar cards cannot.',
    },
    {
      pattern: 'weather-map',
      domain: 'Weather',
      label: 'Weather Map Overlay',
      archetype: 'weather-map',
      widget: 'WeatherWidget',
      interaction: 'Pan route corridor, layer toggle for wind/wave/swell',
      priority: 'informational',
      richness: 95,
      reason: 'Environmental conditions vary spatially along the route — a weather map overlay links meteo data to geographic context.',
    },
    {
      pattern: 'weather-heatmap',
      domain: 'Weather',
      label: 'Sea State Heatmap',
      archetype: 'heatmap',
      widget: 'WeatherWidget',
      interaction: 'Brush time range, hover cell for Hs/Tp values',
      priority: 'informational',
      richness: 88,
      reason: 'Wave height and period over time form a two-dimensional matrix — heatmaps expose dangerous sea-state clusters.',
    },
    {
      pattern: 'weather-area-chart',
      domain: 'Weather',
      label: 'Meteo Area Chart',
      archetype: 'area-chart',
      widget: 'WeatherWidget',
      interaction: 'Toggle wind/wave layers, crosshair for peak values',
      priority: 'informational',
      richness: 85,
      reason: 'Weather trends over voyage duration are temporal — stacked area charts show cumulative exposure to adverse conditions.',
    },
  ],
  Navigation: [
    {
      pattern: 'interactive-map',
      domain: 'Navigation',
      label: 'Interactive AIS Map',
      archetype: 'route-map',
      widget: 'AISLiveFeed',
      interaction: 'Pan/zoom, MMSI lookup, AIS layer toggle, live position',
      priority: 'operational',
      richness: 98,
      reason: 'Position and AIS data are inherently geospatial — an interactive map is the only visualization that preserves bearing, proximity, and traffic context.',
    },
    {
      pattern: 'route-timeline',
      domain: 'Navigation',
      label: 'Route Timeline',
      archetype: 'timeline',
      widget: 'VoyageProgressTracker',
      interaction: 'Click legs for ETA/distance, scrub voyage progress',
      priority: 'operational',
      richness: 90,
      reason: 'Voyage legs are sequential temporal events — a route timeline communicates passage order, ETAs, and delays better than static cards.',
    },
    {
      pattern: 'voyage-tracker',
      domain: 'Navigation',
      label: 'Voyage Track Map',
      archetype: 'route-map',
      widget: 'VoyageProgressTracker',
      interaction: 'Track replay, progress ring, vessel marker along path',
      priority: 'operational',
      richness: 96,
      reason: 'Route progress combines geography and time — a voyage tracker map with track overlay is the maritime standard for passage monitoring.',
    },
  ],
  OperationalKPI: [
    {
      pattern: 'circular-progress',
      domain: 'OperationalKPI',
      label: 'Circular Progress Ring',
      archetype: 'circular-progress',
      widget: 'FuelGaugeCards',
      interaction: 'Hover for threshold bands, animate fill on update',
      priority: 'operational',
      richness: 82,
      reason: 'Tank fill and completion metrics are bounded ratios — circular progress rings communicate percentage state with immediate visual weight.',
    },
    {
      pattern: 'bullet-chart',
      domain: 'OperationalKPI',
      label: 'Bullet Chart',
      archetype: 'bullet-chart',
      widget: 'KPIDashboard',
      interaction: 'Hover qualitative ranges, compare actual vs target',
      priority: 'informational',
      richness: 84,
      reason: 'Scalar KPIs with targets need compact comparison — bullet charts show actual, target, and qualitative bands in minimal space.',
    },
    {
      pattern: 'sparkline',
      domain: 'OperationalKPI',
      label: 'Sparkline Trend',
      archetype: 'sparkline',
      widget: 'SensorStreamPanel',
      interaction: 'Hover data points, brush recent window',
      priority: 'operational',
      richness: 86,
      reason: 'Operational scalars with history benefit from inline sparklines — trend direction matters as much as the current value.',
    },
    {
      pattern: 'kpi-card',
      domain: 'OperationalKPI',
      label: 'KPI Card',
      archetype: 'kpi',
      widget: 'KPIDashboard',
      interaction: 'Click for drill-down trend',
      priority: 'informational',
      richness: 45,
      reason: 'Fallback for isolated scalars without trend or target context — used only when richer patterns are unavailable.',
    },
  ],
  Sustainability: [
    {
      pattern: 'grade-indicator',
      domain: 'Sustainability',
      label: 'CII Grade Indicator',
      archetype: 'grade-indicator',
      widget: 'KPIDashboard',
      interaction: 'Hover for rating boundaries, year-over-year comparison',
      priority: 'informational',
      richness: 88,
      reason: 'CII and emissions ratings are categorical grades — a grade indicator (A–E) communicates regulatory standing instantly.',
    },
    {
      pattern: 'emission-trend',
      domain: 'Sustainability',
      label: 'Emission Trend Chart',
      archetype: 'area-chart',
      widget: 'KPIDashboard',
      interaction: 'Brush voyage segments, overlay regulatory limit line',
      priority: 'informational',
      richness: 91,
      reason: 'CO₂ and emission data accumulate over time — trend charts reveal whether efficiency measures are reducing carbon intensity.',
    },
    {
      pattern: 'carbon-gauge',
      domain: 'Sustainability',
      label: 'Carbon Intensity Gauge',
      archetype: 'carbon-gauge',
      widget: 'KPIDashboard',
      interaction: 'Threshold coloring against IMO limits, voyage projection',
      priority: 'informational',
      richness: 87,
      reason: 'Carbon intensity is a bounded performance metric — a dedicated carbon gauge shows proximity to regulatory thresholds.',
    },
  ],
  Alerts: [
    {
      pattern: 'alert-timeline',
      domain: 'Alerts',
      label: 'Incident Timeline',
      archetype: 'timeline',
      widget: 'AlertPanel',
      interaction: 'Chronological scrub, filter by severity, acknowledge inline',
      priority: 'safety-critical',
      richness: 94,
      reason: 'Safety events are temporal sequences — a timeline reveals incident clustering, escalation patterns, and response latency.',
    },
    {
      pattern: 'severity-chart',
      domain: 'Alerts',
      label: 'Severity Distribution Chart',
      archetype: 'severity-chart',
      widget: 'AlertPanel',
      interaction: 'Click severity band to filter stream, hover for counts',
      priority: 'safety-critical',
      richness: 89,
      reason: 'Alert severity mix is categorical-distributional — a severity chart shows whether the vessel is trending toward critical events.',
    },
    {
      pattern: 'incident-heatmap',
      domain: 'Alerts',
      label: 'Incident Heatmap',
      archetype: 'heatmap',
      widget: 'AlertPanel',
      interaction: 'Hover cells for incident detail, toggle subsystem axis',
      priority: 'safety-critical',
      richness: 87,
      reason: 'Repeated incidents by subsystem and time form a matrix — heatmaps expose chronic problem areas requiring maintenance.',
    },
  ],
  Fleet: [
    {
      pattern: 'comparison-table',
      domain: 'Fleet',
      label: 'Fleet Comparison Table',
      archetype: 'table',
      widget: 'KPIDashboard',
      interaction: 'Sort columns, row highlight, vessel filter',
      priority: 'informational',
      richness: 83,
      reason: 'Multi-vessel benchmarking requires side-by-side metrics — comparison tables preserve exact values for fleet performance review.',
    },
    {
      pattern: 'fleet-heatmap',
      domain: 'Fleet',
      label: 'Fleet Performance Heatmap',
      archetype: 'heatmap',
      widget: 'KPIDashboard',
      interaction: 'Hover for vessel/metric values, color scale legend',
      priority: 'informational',
      richness: 90,
      reason: 'Fleet-wide KPI matrices reveal outliers — heatmaps make underperforming vessels and metrics visible at a glance.',
    },
    {
      pattern: 'bubble-chart',
      domain: 'Fleet',
      label: 'Fleet Bubble Chart',
      archetype: 'bubble-chart',
      widget: 'KPIDashboard',
      interaction: 'Hover vessel label, zoom cluster, size = cargo volume',
      priority: 'informational',
      richness: 92,
      reason: 'Three-variable fleet comparison (e.g. speed × fuel × cargo) needs a bubble chart — position and size encode performance dimensions.',
    },
  ],
  Machinery: [
    {
      pattern: 'machinery-gauge',
      domain: 'Machinery',
      label: 'Machinery Radial Gauge',
      archetype: 'gauge',
      widget: 'EngineMonitor',
      interaction: 'Live value tooltip, threshold band coloring',
      priority: 'operational',
      richness: 88,
      reason: 'Engine RPM, load, and temperature are real-time bounded scalars — radial gauges with threshold bands are standard machinery UX.',
    },
    {
      pattern: 'sensor-stream',
      domain: 'Machinery',
      label: 'Live Sensor Stream',
      archetype: 'sparkline',
      widget: 'SensorStreamPanel',
      interaction: 'Auto-refresh, pause/resume, anomaly markers',
      priority: 'operational',
      richness: 91,
      reason: 'Telemetry streams are high-frequency temporal — live sparkline panels reveal rate-of-change that snapshot gauges miss.',
    },
  ],
  Crew: [
    {
      pattern: 'crew-hierarchy',
      domain: 'Crew',
      label: 'Crew Hierarchy Tree',
      archetype: 'list',
      widget: 'CrewCertificationStatus',
      interaction: 'Expand/collapse ranks, filter by expiry, status badges',
      priority: 'safety-critical',
      richness: 80,
      reason: 'Crew roster and certification data is hierarchical — tree/list layouts preserve rank structure and compliance status.',
    },
  ],
};

const PATTERN_TO_DOMAIN = new Map<VisualizationPattern, SemanticDomain>();
for (const [domain, specs] of Object.entries(DOMAIN_PATTERNS) as [SemanticDomain, VisualizationSpec[]][]) {
  for (const spec of specs) {
    PATTERN_TO_DOMAIN.set(spec.pattern, domain);
  }
}

const WIDGET_DOMAIN_HINTS: [RegExp, SemanticDomain][] = [
  [/Weather/i, 'Weather'],
  [/Voyage|AIS|GPS|Tracker/i, 'Navigation'],
  [/Alert/i, 'Alerts'],
  [/Crew|Cert/i, 'Crew'],
  [/Engine|Sensor/i, 'Machinery'],
  [/Fuel|Gauge/i, 'OperationalKPI'],
  [/KPI/i, 'OperationalKPI'],
];

const METRIC_DOMAIN_HINTS: [RegExp, SemanticDomain][] = [
  [/\b(weather|wind|wave|swell|meteo|sea.?state)\b/i, 'Weather'],
  [/\b(position|lat|lng|ais|route|voyage|eta|waypoint|leg|heading|cog|sog|track)\b/i, 'Navigation'],
  [/\b(alert|alarm|incident|emergency|critical|warning|severity)\b/i, 'Alerts'],
  [/\b(crew|stcw|cert|roster|officer|fatigue)\b/i, 'Crew'],
  [/\b(engine|rpm|load|machinery|shaft|bearing|sensor|telemetry)\b/i, 'Machinery'],
  [/\b(cii|co2|emission|carbon|eexi|sustainability|green)\b/i, 'Sustainability'],
  [/\b(fleet|multi.?vessel|benchmark|comparison|vessels)\b/i, 'Fleet'],
  [/\b(fuel|tank|consumption|kpi|efficiency|level|burn)\b/i, 'OperationalKPI'],
];

export function detectSemanticDomain(
  text: string,
  widgetName?: string
): SemanticDomain {
  if (widgetName) {
    for (const [pattern, domain] of WIDGET_DOMAIN_HINTS) {
      if (pattern.test(widgetName)) return domain;
    }
  }
  for (const [pattern, domain] of METRIC_DOMAIN_HINTS) {
    if (pattern.test(text)) return domain;
  }
  return 'OperationalKPI';
}

export interface VisualizationAssignment {
  domain: SemanticDomain;
  pattern: VisualizationPattern;
  visualization: string;
  archetype: string;
  widget: string;
  interaction: string;
  priority: VisualizationPriority;
  reason: string;
  richness: number;
}

/** Pick the richest unused visualization for a domain. */
export function selectVisualizationForDomain(
  domain: SemanticDomain,
  usedPatterns: Set<VisualizationPattern>,
  preferRich = true
): VisualizationAssignment {
  const candidates = [...DOMAIN_PATTERNS[domain]].sort((a, b) =>
    preferRich ? b.richness - a.richness : a.richness - b.richness
  );

  const spec = candidates.find((c) => !usedPatterns.has(c.pattern)) ?? candidates[0];

  return {
    domain,
    pattern: spec.pattern,
    visualization: spec.label,
    archetype: spec.archetype,
    widget: spec.widget,
    interaction: spec.interaction,
    priority: spec.priority,
    reason: spec.reason,
    richness: spec.richness,
  };
}

export interface DashboardSection {
  id: string;
  widget: string;
  metrics?: string[];
  text?: string;
}

/** Assign diverse visualizations across dashboard sections — no duplicate patterns across domains. */
export function assignDashboardVisualizations(
  sections: DashboardSection[]
): Map<string, VisualizationAssignment> {
  const assignments = new Map<string, VisualizationAssignment>();
  const usedPatterns = new Set<VisualizationPattern>();
  const usedArchetypes = new Set<string>();

  const sorted = [...sections].sort((a, b) => {
    const domainA = detectSemanticDomain(`${a.text ?? ''} ${a.metrics?.join(' ') ?? ''}`, a.widget);
    const domainB = detectSemanticDomain(`${b.text ?? ''} ${b.metrics?.join(' ') ?? ''}`, b.widget);
    const richnessA = DOMAIN_PATTERNS[domainA][0]?.richness ?? 0;
    const richnessB = DOMAIN_PATTERNS[domainB][0]?.richness ?? 0;
    return richnessB - richnessA;
  });

  for (const section of sorted) {
    const context = `${section.text ?? ''} ${section.metrics?.join(' ') ?? ''}`;
    let domain = detectSemanticDomain(context, section.widget);

    if (domain === 'OperationalKPI' && /\b(cii|co2|emission|carbon)\b/i.test(context)) {
      domain = 'Sustainability';
    }
    if (domain === 'OperationalKPI' && /\b(fleet|vessels|comparison)\b/i.test(context)) {
      domain = 'Fleet';
    }

    let assignment = selectVisualizationForDomain(domain, usedPatterns);

    if (usedArchetypes.has(assignment.archetype) && assignment.richness < 80) {
      const alt = DOMAIN_PATTERNS[domain].find(
        (s) => !usedPatterns.has(s.pattern) && !usedArchetypes.has(s.archetype) && s.richness >= 80
      );
      if (alt) {
        assignment = {
          domain,
          pattern: alt.pattern,
          visualization: alt.label,
          archetype: alt.archetype,
          widget: alt.widget,
          interaction: alt.interaction,
          priority: alt.priority,
          reason: alt.reason,
          richness: alt.richness,
        };
      }
    }

    usedPatterns.add(assignment.pattern);
    usedArchetypes.add(assignment.archetype);
    assignments.set(section.id, { ...assignment, widget: section.widget });
  }

  return assignments;
}

/** Verify no pattern is assigned to multiple domains. */
export function validateVisualDiversity(
  assignments: VisualizationAssignment[]
): { valid: boolean; conflicts: string[] } {
  const patternDomains = new Map<VisualizationPattern, SemanticDomain>();
  const conflicts: string[] = [];

  for (const a of assignments) {
    const existing = patternDomains.get(a.pattern);
    if (existing && existing !== a.domain) {
      conflicts.push(`Pattern "${a.pattern}" used for both ${existing} and ${a.domain}`);
    } else {
      patternDomains.set(a.pattern, a.domain);
    }
  }

  const archetypeCount = new Map<string, number>();
  for (const a of assignments) {
    archetypeCount.set(a.archetype, (archetypeCount.get(a.archetype) ?? 0) + 1);
  }
  for (const [archetype, count] of archetypeCount) {
    if (count > 1 && archetype === 'kpi') {
      conflicts.push(`Identical KPI card layout repeated ${count} times — use bullet charts or sparklines instead`);
    }
  }

  return { valid: conflicts.length === 0, conflicts };
}

export function getDomainPatterns(domain: SemanticDomain): VisualizationSpec[] {
  return DOMAIN_PATTERNS[domain];
}

export function explainVisualization(assignment: VisualizationAssignment): string {
  return `${assignment.visualization} selected for ${assignment.domain}: ${assignment.reason}`;
}
