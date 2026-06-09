import type {
  DatasetVizInput,
  DatasetVizOutput,
  DatasetVizRecommendation,
  FieldClassification,
  FieldDataType,
  FieldDimensions,
  VisualizationPriority,
} from '@/lib/types/visualization';
import {
  detectSemanticDomain,
  explainVisualization,
  selectVisualizationForDomain,
  type VisualizationPattern,
} from './semantic-visualization';

interface VizCandidate {
  widget: string;
  visualization: string;
  archetype: string;
  reason: string;
  interaction: string;
  priority: VisualizationPriority;
  confidence: number;
  objective: string;
}

const SPATIAL_KEYS =
  /\b(lat(itude)?|lng|lon(gitude)?|position|coordinates?|ais|mmsi|heading|cog|bearing|waypoint|geofence)\b/i;
const TEMPORAL_KEYS = /\b(time|timestamp|date|eta|duration|history|trend|series|24h|hourly)\b/i;
const GAUGE_KEYS = /\b(fuel|tank|fill|level|pct|percent|rpm|load|pressure|temp(erature)?|gauge)\b/i;
const SPEED_KEYS = /\b(speed|sog|velocity|knots?)\b/i;
const ALERT_KEYS = /\b(alert|alarm|severity|critical|warning|incident|event)\b/i;
const CREW_KEYS = /\b(crew|officer|cert(ification)?|stcw|roster|rank)\b/i;
const ROUTE_KEYS = /\b(route|voyage|leg|passage|progress|remaining|distance)\b/i;
const KPI_KEYS = /\b(kpi|cii|efficiency|score|performance)\b/i;
const FLEET_KEYS = /\b(fleet|vessel(s)?|ship(s)?|comparison|benchmark)\b/i;
const WEATHER_KEYS = /\b(wind|wave|swell|weather|meteo|sea.?state)\b/i;
const STATUS_KEYS = /\b(status|health|state|condition|operational)\b/i;

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every(isNumber);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string');
}

function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null && !Array.isArray(v[0]);
}

function inferDimensions(field: string, value: unknown): FieldDimensions {
  const spatial = SPATIAL_KEYS.test(field) || (isObjectArray(value) && value.some((r) => SPATIAL_KEYS.test(Object.keys(r).join(' '))));
  const temporal =
    TEMPORAL_KEYS.test(field) ||
    isNumberArray(value) ||
    (Array.isArray(value) && value.length > 1);
  const numerical =
    isNumber(value) ||
    isNumberArray(value) ||
    (isObjectArray(value) && Object.values(value[0]).some(isNumber));
  const categorical =
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    isStringArray(value) ||
    (isObjectArray(value) && Object.values(value[0]).some((v) => typeof v === 'string' && !isNumber(v as unknown)));

  return { spatial, temporal, categorical, numerical };
}

function inferDataType(field: string, value: unknown, dims: FieldDimensions): FieldDataType {
  if (dims.spatial && (isNumber(value) || isNumberArray(value) || isObjectArray(value))) return 'spatial';
  if (isNumberArray(value) && dims.temporal) return 'timeseries';
  if (Array.isArray(value)) return isObjectArray(value) ? 'structured' : 'categorical';
  if (typeof value === 'boolean') return 'boolean';
  if (isNumber(value)) return 'numerical';
  if (typeof value === 'string') {
    if (TEMPORAL_KEYS.test(field) || /^\d{4}-\d{2}/.test(value)) return 'temporal';
    if (STATUS_KEYS.test(field) || ALERT_KEYS.test(field)) return 'categorical';
    return 'text';
  }
  if (typeof value === 'object' && value !== null) return 'structured';
  return dims.numerical ? 'numerical' : 'text';
}

function summarizeValue(value: unknown): string {
  if (isNumberArray(value)) return `series[${value.length}] ${value.slice(0, 3).join(', ')}…`;
  if (isNumber(value)) return String(value);
  if (typeof value === 'string') return value.slice(0, 40);
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === 'boolean') return String(value);
  return 'object';
}

function resolveMonitoringObjective(
  field: string,
  dims: FieldDimensions,
  dataType: FieldDataType,
  domainContext: string,
  userGoal: string
): string {
  const goal = userGoal.toLowerCase();
  const domain = domainContext.toLowerCase();
  const f = field.toLowerCase();

  if (goal.includes('safety') || goal.includes('alert') || ALERT_KEYS.test(f)) return 'safety_monitoring';
  if (goal.includes('compare') || goal.includes('fleet') || FLEET_KEYS.test(f)) return 'fleet_comparison';
  if (goal.includes('track') || goal.includes('route') || ROUTE_KEYS.test(f)) return 'route_tracking';
  if (goal.includes('trend') || goal.includes('history') || dataType === 'timeseries') return 'trend_analysis';
  if (goal.includes('monitor') && GAUGE_KEYS.test(f)) return 'threshold_monitoring';
  if (dims.spatial || domain.includes('navigation')) return 'spatial_awareness';
  if (domain.includes('engine') || domain.includes('machinery')) return 'machinery_monitoring';
  return 'operational_monitoring';
}

function score(base: number, bonuses: number[]): number {
  const raw = base + bonuses.reduce((a, b) => a + b, 0);
  return Math.min(0.99, Math.round(raw * 100) / 100);
}

function resolveWidget(
  field: string,
  value: unknown,
  classification: FieldClassification,
  userGoal: string
): string {
  const f = field.toLowerCase();
  const { dimensions: dims, dataType } = classification;

  if (dims.spatial || dataType === 'spatial') {
    return /\b(track|history|breadcrumb|replay)\b/i.test(f + userGoal) ? 'GPSTracker' : 'AISLiveFeed';
  }
  if (ROUTE_KEYS.test(f)) return 'VoyageProgressTracker';
  if (GAUGE_KEYS.test(f) && isNumber(value)) return 'FuelGaugeCards';
  if (ALERT_KEYS.test(f)) return 'AlertPanel';
  if (CREW_KEYS.test(f)) return 'CrewCertificationStatus';
  if (FLEET_KEYS.test(f)) return 'KPIDashboard';
  if (WEATHER_KEYS.test(f)) return 'WeatherWidget';
  if (KPI_KEYS.test(f) || /\b(cii|co2|emission|carbon)\b/i.test(f)) return 'KPIDashboard';
  if (SPEED_KEYS.test(f) || dataType === 'timeseries') return 'SensorStreamPanel';
  if (/\b(engine|rpm|machinery)\b/i.test(f)) return 'EngineMonitor';
  return 'KPIDashboard';
}

function pickVisualization(
  field: string,
  value: unknown,
  classification: FieldClassification,
  domainContext: string,
  userGoal: string,
  usedPatterns: Set<VisualizationPattern>
): VizCandidate {
  const { dimensions: dims, dataType } = classification;
  const f = field.toLowerCase();
  const widget = resolveWidget(field, value, classification, userGoal);

  let domain = detectSemanticDomain(`${f} ${domainContext} ${userGoal}`, widget);
  if (domain === 'OperationalKPI' && /\b(cii|co2|emission|carbon)\b/i.test(f)) domain = 'Sustainability';
  if (domain === 'OperationalKPI' && FLEET_KEYS.test(f)) domain = 'Fleet';
  if (domain === 'OperationalKPI' && (dataType === 'timeseries' || isNumberArray(value))) domain = 'Machinery';

  const semantic = selectVisualizationForDomain(domain, usedPatterns);
  usedPatterns.add(semantic.pattern);

  const baseConfidence =
    dataType === 'timeseries' ? 0.9 :
    dims.spatial ? 0.91 :
    ALERT_KEYS.test(f) ? 0.87 :
    0.84;

  return {
    widget,
    visualization: semantic.visualization,
    archetype: semantic.archetype,
    reason: explainVisualization(semantic),
    interaction: semantic.interaction,
    priority: semantic.priority,
    confidence: score(baseConfidence, [semantic.richness > 80 ? 0.05 : 0]),
    objective: resolveMonitoringObjective(field, dims, dataType, domainContext, userGoal),
  };
}

function classifyField(
  field: string,
  value: unknown,
  domainContext: string,
  userGoal: string
): FieldClassification {
  const dimensions = inferDimensions(field, value);
  const dataType = inferDataType(field, value, dimensions);
  const monitoringObjective = resolveMonitoringObjective(field, dimensions, dataType, domainContext, userGoal);

  return {
    field,
    dataType,
    dimensions,
    monitoringObjective,
    sampleSummary: summarizeValue(value),
  };
}

/**
 * Visualization Recommendation Agent — analyzes structured datasets and recommends React widgets.
 */
export function recommendFromDataset(input: DatasetVizInput): DatasetVizOutput {
  const domainContext = input.domainContext ?? 'vessel monitoring';
  const userGoal = input.userGoal ?? 'operational monitoring';
  const entries = Object.entries(input.dataset);

  const usedPatterns = new Set<VisualizationPattern>();
  const recommendations: DatasetVizRecommendation[] = entries.map(([field, value]) => {
    const classification = classifyField(field, value, domainContext, userGoal);
    const pick = pickVisualization(field, value, classification, domainContext, userGoal, usedPatterns);

    return {
      field,
      widget: pick.widget,
      visualization: pick.visualization,
      archetype: pick.archetype,
      reason: pick.reason,
      confidence: pick.confidence,
      interaction: pick.interaction,
      priority: pick.priority,
      classification: {
        ...classification,
        monitoringObjective: pick.objective,
      },
    };
  });

  const monitoringObjective =
    recommendations.length > 0
      ? recommendations[0].classification.monitoringObjective
      : resolveMonitoringObjective('', { spatial: false, temporal: false, categorical: false, numerical: false }, 'text', domainContext, userGoal);

  return {
    recommendations,
    monitoringObjective,
    domainContext,
    userGoal,
  };
}

/** Example from spec: { speed: [12,14,16,15,18] } → LineChart */
export function recommendField(
  field: string,
  value: unknown,
  domainContext = 'vessel monitoring',
  userGoal = 'monitor speed trends'
): DatasetVizRecommendation {
  return recommendFromDataset({
    dataset: { [field]: value },
    domainContext,
    userGoal,
  }).recommendations[0];
}
