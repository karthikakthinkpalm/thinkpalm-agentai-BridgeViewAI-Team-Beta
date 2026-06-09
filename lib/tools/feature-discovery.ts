import type { RequirementAnalysis, SelectedWidget } from '@/lib/types/pipeline';
import type {
  DashboardHealth,
  DomainCoverage,
  FeatureDiscoveryResult,
  FeatureRecommendation,
  MaritimeDomain,
  RequirementExtraction,
  VesselType,
  WidgetExplainability,
} from '@/lib/types/feature-discovery';
import { recommendFromDataset } from './dataset-viz-agent';
import { mapWidgets } from './widget-mapper';

const CONFIDENCE_THRESHOLD = 0.7;

const ALL_DOMAINS: MaritimeDomain[] = [
  'Navigation',
  'Weather',
  'Machinery',
  'Safety',
  'Compliance',
  'Crew',
  'Cargo',
  'Fleet',
  'Security',
  'Sustainability',
];

interface DomainRule {
  domain: MaritimeDomain;
  metricPatterns: RegExp[];
  widgetPatterns: RegExp[];
  defaultWidget: string;
  missingFeature: FeatureRecommendation;
}

const DOMAIN_RULES: DomainRule[] = [
  {
    domain: 'Navigation',
    metricPatterns: [/position|lat|lng|ais|route|voyage|eta|speed|cog|heading|waypoint/i],
    widgetPatterns: [/Voyage|AIS|GPS|Tracker/i],
    defaultWidget: 'VoyageProgressTracker',
    missingFeature: {
      feature: 'Interactive Route Map + AIS Overlay',
      widget: 'VoyageProgressTracker',
      domain: 'Navigation',
      businessValue: 'Situational awareness for bridge officers — position, route, and ETA at a glance',
      priority: 'critical',
      confidence: 0.92,
      reason: 'Navigation data detected but no map or voyage tracker widget in dashboard',
    },
  },
  {
    domain: 'Weather',
    metricPatterns: [/weather|wind|wave|swell|sea.?state|meteo/i],
    widgetPatterns: [/Weather/i],
    defaultWidget: 'WeatherWidget',
    missingFeature: {
      feature: 'Weather Risk Overlay',
      widget: 'WeatherWidget',
      domain: 'Weather',
      businessValue: 'Route-corridor weather enables proactive course and speed decisions',
      priority: 'high',
      confidence: 0.88,
      reason: 'Environmental exposure affects safety and fuel — weather panel missing from layout',
    },
  },
  {
    domain: 'Machinery',
    metricPatterns: [/engine|rpm|load|machinery|shaft|bearing|temperature|pressure|sensor/i],
    widgetPatterns: [/Engine|Monitor|Sensor/i],
    defaultWidget: 'EngineMonitor',
    missingFeature: {
      feature: 'Machinery Health Dashboard',
      widget: 'EngineMonitor',
      domain: 'Machinery',
      businessValue: 'Early detection of machinery anomalies prevents costly breakdowns at sea',
      priority: 'high',
      confidence: 0.9,
      reason: 'Engine or sensor telemetry present without machinery monitoring widget',
    },
  },
  {
    domain: 'Safety',
    metricPatterns: [/alert|alarm|critical|warning|emergency|incident|collision|mayday/i],
    widgetPatterns: [/Alert/i],
    defaultWidget: 'AlertPanel',
    missingFeature: {
      feature: 'Safety Alert Stream',
      widget: 'AlertPanel',
      domain: 'Safety',
      businessValue: 'Prioritized alert stream ensures critical events reach the bridge immediately',
      priority: 'critical',
      confidence: 0.95,
      reason: 'Safety-critical operations require a dedicated alert panel — none detected',
    },
  },
  {
    domain: 'Compliance',
    metricPatterns: [/compliance|regulation|imo|marpol|ecdis|audit|certificate|inspection/i],
    widgetPatterns: [/Crew|Cert|Compliance/i],
    defaultWidget: 'CrewCertificationStatus',
    missingFeature: {
      feature: 'Compliance Tracker',
      widget: 'CrewCertificationStatus',
      domain: 'Compliance',
      businessValue: 'Regulatory compliance tracking reduces port-state control detention risk',
      priority: 'high',
      confidence: 0.85,
      reason: 'Compliance context implied but no certification or audit tracker widget',
    },
  },
  {
    domain: 'Crew',
    metricPatterns: [/crew|stcw|roster|officer|fatigue|watch|muster/i],
    widgetPatterns: [/Crew/i],
    defaultWidget: 'CrewCertificationStatus',
    missingFeature: {
      feature: 'Crew Status Panel',
      widget: 'CrewCertificationStatus',
      domain: 'Crew',
      businessValue: 'Crew readiness and certification status supports safe manning decisions',
      priority: 'high',
      confidence: 0.87,
      reason: 'Crew data referenced but no roster or certification widget assigned',
    },
  },
  {
    domain: 'Cargo',
    metricPatterns: [/cargo|container|tank|ballast|load|utilization|teu|lng|pressure|boil/i],
    widgetPatterns: [/Fuel|KPI|Cargo/i],
    defaultWidget: 'KPIDashboard',
    missingFeature: {
      feature: 'Cargo Operations Dashboard',
      widget: 'KPIDashboard',
      domain: 'Cargo',
      businessValue: 'Cargo state monitoring prevents operational delays and cargo damage',
      priority: 'medium',
      confidence: 0.82,
      reason: 'Cargo-related metrics detected without dedicated cargo monitoring widget',
    },
  },
  {
    domain: 'Fleet',
    metricPatterns: [/fleet|multi.?vessel|comparison|benchmark|vessels/i],
    widgetPatterns: [/KPI|Fleet/i],
    defaultWidget: 'KPIDashboard',
    missingFeature: {
      feature: 'Fleet Comparison Dashboard',
      widget: 'KPIDashboard',
      domain: 'Fleet',
      businessValue: 'Cross-vessel benchmarking identifies performance outliers across the fleet',
      priority: 'medium',
      confidence: 0.8,
      reason: 'Fleet operations context but no comparison or fleet overview widget',
    },
  },
  {
    domain: 'Security',
    metricPatterns: [/security|piracy|threat|intrusion|access|cyber/i],
    widgetPatterns: [/Alert|Security/i],
    defaultWidget: 'AlertPanel',
    missingFeature: {
      feature: 'Security Event Monitor',
      widget: 'AlertPanel',
      domain: 'Security',
      businessValue: 'Maritime security events require rapid escalation to bridge and shore',
      priority: 'high',
      confidence: 0.78,
      reason: 'Security context in PRD without dedicated threat monitoring panel',
    },
  },
  {
    domain: 'Sustainability',
    metricPatterns: [/cii|co2|emission|carbon|eexi|sustainability|green/i],
    widgetPatterns: [/KPI|CII/i],
    defaultWidget: 'KPIDashboard',
    missingFeature: {
      feature: 'Emissions & CII Tracker',
      widget: 'KPIDashboard',
      domain: 'Sustainability',
      businessValue: 'CII and emissions tracking supports regulatory compliance and charter requirements',
      priority: 'medium',
      confidence: 0.83,
      reason: 'Sustainability metrics referenced but no emissions or efficiency dashboard',
    },
  },
];

const VESSEL_TYPE_RULES: { pattern: RegExp; type: VesselType }[] = [
  { pattern: /\blng\s+carrier\b|\blng\s+pioneer\b|\bboil.?off\b|\bcryogenic\b/i, type: 'LNG Carrier' },
  { pattern: /\bpassenger\s+ferry\b|\bferry\b|\bmuster\b|\bpassenger\s+count\b/i, type: 'Passenger Ferry' },
  { pattern: /\bcontainer\s+vessel\b|\bcontainer\s+ship\b|\bteu\b|\bcontainer\s+utilization\b/i, type: 'Container Vessel' },
  { pattern: /\btanker\b|\bcrude\b|\bproduct\s+tanker\b/i, type: 'Tanker' },
  { pattern: /\bbulk\s+carrier\b|\bbulk\s+vessel\b/i, type: 'Bulk Carrier' },
];

const VESSEL_INTELLIGENCE: Record<Exclude<VesselType, 'General'>, FeatureRecommendation[]> = {
  'LNG Carrier': [
    {
      feature: 'Tank Pressure Monitoring',
      widget: 'FuelGaugeCards',
      domain: 'Cargo',
      businessValue: 'Cryogenic tank pressure is safety-critical for LNG cargo integrity',
      priority: 'critical',
      confidence: 0.94,
      reason: 'LNG carrier operations require continuous tank pressure visibility',
    },
    {
      feature: 'Cargo Temperature Monitoring',
      widget: 'SensorStreamPanel',
      domain: 'Cargo',
      businessValue: 'Cargo temperature drift indicates boil-off or insulation failure',
      priority: 'critical',
      confidence: 0.93,
      reason: 'LNG cargo temperature is a primary operational KPI for LNG carriers',
    },
    {
      feature: 'Boil-Off Gas Monitoring',
      widget: 'SensorStreamPanel',
      domain: 'Sustainability',
      businessValue: 'BOG rate drives fuel planning and emissions reporting',
      priority: 'high',
      confidence: 0.91,
      reason: 'LNG carriers must track boil-off gas for voyage economics and safety',
    },
    {
      feature: 'Gas Leak Detection Panel',
      widget: 'AlertPanel',
      domain: 'Safety',
      businessValue: 'Early gas leak detection prevents catastrophic cargo incidents',
      priority: 'critical',
      confidence: 0.96,
      reason: 'LNG operations mandate gas detection alerting on the bridge',
    },
  ],
  'Passenger Ferry': [
    {
      feature: 'Passenger Count Dashboard',
      widget: 'KPIDashboard',
      domain: 'Cargo',
      businessValue: 'Accurate passenger count supports SOLAS compliance and evacuation planning',
      priority: 'critical',
      confidence: 0.92,
      reason: 'Passenger ferries require real-time occupancy monitoring',
    },
    {
      feature: 'Muster Station Monitoring',
      widget: 'AlertPanel',
      domain: 'Safety',
      businessValue: 'Muster readiness ensures rapid evacuation in emergency scenarios',
      priority: 'critical',
      confidence: 0.9,
      reason: 'Passenger vessel safety regulations require muster station visibility',
    },
    {
      feature: 'Safety Equipment Dashboard',
      widget: 'CrewCertificationStatus',
      domain: 'Safety',
      businessValue: 'Life-saving appliance status reduces PSC deficiency risk',
      priority: 'high',
      confidence: 0.88,
      reason: 'Passenger ferries must track safety equipment readiness',
    },
  ],
  'Container Vessel': [
    {
      feature: 'Cargo Distribution Map',
      widget: 'KPIDashboard',
      domain: 'Cargo',
      businessValue: 'Stowage distribution affects stability and port discharge efficiency',
      priority: 'high',
      confidence: 0.89,
      reason: 'Container vessels benefit from bay/row tier distribution visibility',
    },
    {
      feature: 'Container Utilization Tracker',
      widget: 'KPIDashboard',
      domain: 'Cargo',
      businessValue: 'Utilization metrics drive revenue and slot planning decisions',
      priority: 'medium',
      confidence: 0.86,
      reason: 'Container operations center on TEU utilization KPIs',
    },
    {
      feature: 'Port Operations Dashboard',
      widget: 'VoyageProgressTracker',
      domain: 'Navigation',
      businessValue: 'Berth scheduling and crane productivity depend on accurate ETA and port status',
      priority: 'high',
      confidence: 0.87,
      reason: 'Container vessel schedules are tightly coupled to port turnaround',
    },
  ],
  Tanker: [
    {
      feature: 'Tank Level & Segregation Monitor',
      widget: 'FuelGaugeCards',
      domain: 'Cargo',
      businessValue: 'Cargo segregation and ullage prevent contamination and overflow incidents',
      priority: 'critical',
      confidence: 0.91,
      reason: 'Tanker operations require per-tank level monitoring',
    },
  ],
  'Bulk Carrier': [
    {
      feature: 'Hold Condition Monitor',
      widget: 'KPIDashboard',
      domain: 'Cargo',
      businessValue: 'Hold moisture and temperature protect cargo quality during voyage',
      priority: 'high',
      confidence: 0.84,
      reason: 'Bulk carriers need hold environment visibility',
    },
  ],
};

const PREDICTIVE_PATTERNS: { pattern: RegExp; feature: FeatureRecommendation }[] = [
  {
    pattern: /\b(history|historical|trend|24h|timeseries|past\s+voyage)\b/i,
    feature: {
      feature: 'Predictive ETA',
      widget: 'VoyageProgressTracker',
      domain: 'Navigation',
      businessValue: 'ML-enhanced ETA reduces port scheduling uncertainty',
      priority: 'medium',
      confidence: 0.82,
      reason: 'Historical voyage data enables predictive arrival forecasting',
    },
  },
  {
    pattern: /\b(fuel|consumption|burn|bunker)\b/i,
    feature: {
      feature: 'Fuel Consumption Forecast',
      widget: 'FuelGaugeCards',
      domain: 'Sustainability',
      businessValue: 'Fuel forecasting optimizes bunkering and voyage economics',
      priority: 'medium',
      confidence: 0.85,
      reason: 'Fuel trend history supports consumption forecasting',
    },
  },
  {
    pattern: /\b(engine|rpm|machinery|maintenance|hours)\b/i,
    feature: {
      feature: 'Maintenance Forecast',
      widget: 'EngineMonitor',
      domain: 'Machinery',
      businessValue: 'Predictive maintenance reduces unplanned downtime at sea',
      priority: 'high',
      confidence: 0.81,
      reason: 'Machinery telemetry with run-hours enables maintenance prediction',
    },
  },
  {
    pattern: /\b(weather|wave|wind|route)\b/i,
    feature: {
      feature: 'Route Risk Prediction',
      widget: 'WeatherWidget',
      domain: 'Safety',
      businessValue: 'Weather-risk scoring supports go/no-go routing decisions',
      priority: 'high',
      confidence: 0.79,
      reason: 'Combined route and weather data enables risk prediction overlays',
    },
  },
  {
    pattern: /\b(route|voyage|optimization|efficiency)\b/i,
    feature: {
      feature: 'Route Optimization Advisor',
      widget: 'VoyageProgressTracker',
      domain: 'Navigation',
      businessValue: 'Optimized routing reduces fuel burn and time en route',
      priority: 'medium',
      confidence: 0.8,
      reason: 'Voyage planning context with efficiency goals suggests route optimization',
    },
  },
];

export function detectVesselType(prd: string): VesselType {
  for (const rule of VESSEL_TYPE_RULES) {
    if (rule.pattern.test(prd)) return rule.type;
  }
  return 'General';
}

export function extractRequirements(prd: string, requirements?: RequirementAnalysis): RequirementExtraction {
  const lower = prd.toLowerCase();
  const metricText = (requirements?.metrics ?? [])
    .map((m) => `${m.name} ${m.description} ${m.entity ?? ''}`)
    .join(' ');
  const combined = `${lower} ${metricText}`;

  return {
    vesselType: detectVesselType(prd),
    voyageInformation: /\b(voyage|route|leg|eta|passage|port)\b/i.test(combined),
    navigationData: /\b(position|lat|lng|ais|speed|cog|heading|waypoint)\b/i.test(combined),
    fleetData: /\b(fleet|multi.?vessel|vessels|benchmark)\b/i.test(combined),
    engineData: /\b(engine|rpm|load|machinery|shaft)\b/i.test(combined),
    fuelData: /\b(fuel|hfo|mdo|bunker|tank|consumption)\b/i.test(combined),
    weatherData: /\b(weather|wind|wave|swell|meteo)\b/i.test(combined),
    crewData: /\b(crew|stcw|roster|officer|certification)\b/i.test(combined),
    cargoData: /\b(cargo|container|tank|ballast|teu|load)\b/i.test(combined),
    complianceData: /\b(compliance|regulation|imo|marpol|audit|inspection)\b/i.test(combined),
    safetyData: /\b(safety|alert|emergency|incident|collision)\b/i.test(combined),
  };
}

function domainSignalsPresent(rule: DomainRule, prd: string, requirements?: RequirementAnalysis): boolean {
  const metricText = (requirements?.metrics ?? [])
    .map((m) => `${m.name} ${m.description}`)
    .join(' ');
  const combined = `${prd} ${metricText}`;
  return rule.metricPatterns.some((p) => p.test(combined));
}

export function analyzeDomainCoverage(
  prd: string,
  existingWidgets: string[],
  requirements?: RequirementAnalysis
): DomainCoverage[] {
  const metricNames = (requirements?.metrics ?? []).map((m) => m.name);

  return DOMAIN_RULES.map((rule) => {
    const widgets = existingWidgets.filter((w) => rule.widgetPatterns.some((p) => p.test(w)));
    const metrics = metricNames.filter((m) => rule.metricPatterns.some((p) => p.test(m)));
    const hasSignal = domainSignalsPresent(rule, prd, requirements);
    const covered = widgets.length > 0 || (hasSignal && metrics.length > 0);

    return {
      domain: rule.domain,
      covered,
      widgets,
      metrics,
    };
  });
}

function filterByConfidence(recs: FeatureRecommendation[]): FeatureRecommendation[] {
  return recs.filter((r) => r.confidence > CONFIDENCE_THRESHOLD);
}

function dedupeRecommendations(recs: FeatureRecommendation[]): FeatureRecommendation[] {
  const seen = new Set<string>();
  return recs.filter((r) => {
    const key = `${r.feature}:${r.widget}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function generateMissingFeatureRecommendations(
  coverage: DomainCoverage[],
  vesselType: VesselType,
  prd: string
): FeatureRecommendation[] {
  const missing = coverage.filter((c) => !c.covered);
  const domainRecs = missing
    .map((c) => DOMAIN_RULES.find((r) => r.domain === c.domain)?.missingFeature)
    .filter((r): r is FeatureRecommendation => Boolean(r));

  const vesselRecs =
    vesselType !== 'General' ? (VESSEL_INTELLIGENCE[vesselType] ?? []) : [];

  const predictiveRecs = PREDICTIVE_PATTERNS.filter((p) => p.pattern.test(prd)).map((p) => p.feature);

  return dedupeRecommendations(
    filterByConfidence([...domainRecs, ...vesselRecs, ...predictiveRecs])
  );
}

export function evaluateDashboardHealth(
  coverage: DomainCoverage[],
  recommendations: FeatureRecommendation[]
): DashboardHealth {
  const coveredCount = coverage.filter((c) => c.covered).length;
  const coverageScore = Math.round((coveredCount / ALL_DOMAINS.length) * 100);

  const domainScore = (domains: MaritimeDomain[]) => {
    const subset = coverage.filter((c) => domains.includes(c.domain));
    if (subset.length === 0) return 0;
    return Math.round((subset.filter((c) => c.covered).length / subset.length) * 100);
  };

  return {
    coverageScore,
    navigationCoverage: domainScore(['Navigation', 'Weather']),
    operationalCoverage: domainScore(['Machinery', 'Cargo', 'Weather']),
    safetyCoverage: domainScore(['Safety', 'Security']),
    complianceCoverage: domainScore(['Compliance', 'Crew']),
    fleetCoverage: domainScore(['Fleet', 'Sustainability']),
    missingCapabilities: coverage.filter((c) => !c.covered).map((c) => c.domain),
    recommendedFeatures: recommendations,
  };
}

export function buildWidgetExplainability(
  selectedWidgets: SelectedWidget[],
  prd: string,
  requirements?: RequirementAnalysis
): WidgetExplainability[] {
  return selectedWidgets.map((w) => {
    const metrics = w.metrics.join(', ') || 'PRD keywords';
    const dataSource = requirements?.metrics
      .filter((m) => w.metrics.includes(m.name))
      .map((m) => m.entity ?? m.name)
      .join(', ') || 'maritime telemetry / PRD specification';

    return {
      widget: w.name,
      generatedBecause: w.reason,
      dataSource,
      confidence: w.confidence,
      businessValue: `${w.visualization} supports ${requirements?.domain ?? 'vessel'} monitoring for ${metrics}`,
    };
  });
}

export function expandWidgetsFromNewFields(
  dataset: Record<string, unknown>,
  existingWidgets: string[],
  domainContext?: string
): { widgets: string[]; recommendations: FeatureRecommendation[] } {
  const result = recommendFromDataset({ dataset, domainContext });
  const newWidgets: string[] = [];
  const recommendations: FeatureRecommendation[] = [];

  for (const rec of result.recommendations) {
    if (rec.confidence <= CONFIDENCE_THRESHOLD) continue;
    if (existingWidgets.includes(rec.widget)) continue;

    newWidgets.push(rec.widget);
    recommendations.push({
      feature: rec.visualization,
      widget: rec.widget,
      domain: inferDomainFromField(rec.field),
      businessValue: `Auto-discovered from new field "${rec.field}" — ${rec.classification.monitoringObjective}`,
      priority: rec.priority === 'safety-critical' ? 'critical' : rec.priority === 'operational' ? 'high' : 'medium',
      confidence: rec.confidence,
      reason: rec.reason,
    });
  }

  return { widgets: [...new Set(newWidgets)], recommendations };
}

function inferDomainFromField(field: string): MaritimeDomain {
  const f = field.toLowerCase();
  if (/lat|lng|position|ais|route|voyage/.test(f)) return 'Navigation';
  if (/wind|wave|weather|swell/.test(f)) return 'Weather';
  if (/engine|rpm|machinery/.test(f)) return 'Machinery';
  if (/alert|alarm|incident/.test(f)) return 'Safety';
  if (/crew|cert|stcw/.test(f)) return 'Crew';
  if (/fuel|tank|cargo|container/.test(f)) return 'Cargo';
  if (/fleet|vessel/.test(f)) return 'Fleet';
  if (/cii|emission|co2/.test(f)) return 'Sustainability';
  return 'Navigation';
}

/** Merge high-confidence discovered widgets into the selected widget list. */
export function mergeDiscoveredWidgets(
  selected: SelectedWidget[],
  recommendations: FeatureRecommendation[],
  requirements: RequirementAnalysis
): { widgets: SelectedWidget[]; autoExpanded: string[] } {
  const existing = new Set(selected.map((w) => w.name));
  const autoExpanded: string[] = [];
  const merged = [...selected];

  for (const rec of recommendations) {
    if (rec.confidence <= CONFIDENCE_THRESHOLD) continue;
    if (existing.has(rec.widget)) continue;

    existing.add(rec.widget);
    autoExpanded.push(rec.widget);
    merged.push({
      name: rec.widget,
      description: rec.feature,
      archetype: widgetArchetype(rec.widget),
      metrics: [],
      visualization: rec.feature,
      reason: rec.reason,
      confidence: rec.confidence,
      interaction: 'Auto-expanded by BridgeView feature discovery',
      priority: rec.priority === 'critical' ? 'safety-critical' : 'operational',
    });
  }

  if (merged.length === selected.length && selected.length < 3) {
    const defaults = mapWidgets('');
    for (const name of defaults) {
      if (!existing.has(name)) {
        existing.add(name);
        autoExpanded.push(name);
        merged.push({
          name,
          description: `Baseline ${name} for ${requirements.domain}`,
          archetype: widgetArchetype(name),
          metrics: [],
          visualization: name,
          reason: 'Maritime best-practice baseline widget added for operational coverage',
          confidence: 0.75,
          interaction: 'Standard bridge monitoring',
          priority: 'operational',
        });
      }
    }
  }

  return { widgets: merged, autoExpanded };
}

function widgetArchetype(widget: string): string {
  if (/Voyage|AIS|GPS|Tracker/i.test(widget)) return 'route-map';
  if (/Fuel|Engine|Sensor|Gauge/i.test(widget)) return 'gauge';
  if (/Alert/i.test(widget)) return 'alert';
  if (/Crew/i.test(widget)) return 'list';
  if (/KPI/i.test(widget)) return 'kpi';
  if (/Weather/i.test(widget)) return 'kpi';
  return 'card';
}

/** Full BridgeView AI feature discovery pass. */
export function runFeatureDiscovery(
  prd: string,
  options: {
    requirements?: RequirementAnalysis;
    selectedWidgets?: SelectedWidget[];
    dataset?: Record<string, unknown>;
  } = {}
): FeatureDiscoveryResult {
  const { requirements, selectedWidgets = [], dataset } = options;

  const reqExtraction = extractRequirements(prd, requirements);
  const widgetNames = [
    ...selectedWidgets.map((w) => w.name),
    ...mapWidgets(prd),
  ];
  const uniqueWidgets = [...new Set(widgetNames)];

  const domainCoverage = analyzeDomainCoverage(prd, uniqueWidgets, requirements);

  let recommendations = generateMissingFeatureRecommendations(
    domainCoverage,
    reqExtraction.vesselType,
    prd
  );

  let autoExpandedWidgets: string[] = [];

  if (dataset && Object.keys(dataset).length > 0) {
    const expansion = expandWidgetsFromNewFields(dataset, uniqueWidgets, requirements?.domain);
    autoExpandedWidgets = expansion.widgets;
    recommendations = dedupeRecommendations([...recommendations, ...expansion.recommendations]);
  }

  const dashboardHealth = evaluateDashboardHealth(domainCoverage, recommendations);

  const vesselTypeRecommendations =
    reqExtraction.vesselType !== 'General'
      ? filterByConfidence(VESSEL_INTELLIGENCE[reqExtraction.vesselType] ?? [])
      : [];

  const predictiveFeatures = filterByConfidence(
    PREDICTIVE_PATTERNS.filter((p) => p.pattern.test(prd)).map((p) => p.feature)
  );

  const widgetExplainability = buildWidgetExplainability(selectedWidgets, prd, requirements);

  return {
    requirements: reqExtraction,
    domainCoverage,
    dashboardHealth,
    vesselTypeRecommendations,
    predictiveFeatures,
    widgetExplainability,
    autoExpandedWidgets,
  };
}
