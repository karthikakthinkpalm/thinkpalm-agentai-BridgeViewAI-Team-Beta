/** Keyword → canonical maritime widget names for hierarchy proposals */

export const ALL_MARITIME_WIDGETS = [
  'VoyageProgressTracker',
  'FuelGaugeCards',
  'CrewCertificationStatus',
  'AlertPanel',
  'WeatherWidget',
  'EngineMonitor',
  'KPIDashboard',
] as const;

export type MaritimeWidget = (typeof ALL_MARITIME_WIDGETS)[number];

const KEYWORD_MAP: [string[], MaritimeWidget][] = [
  [['voyage', 'tracking', 'ais', 'route', 'ship', 'progress', 'leg', 'eta'], 'VoyageProgressTracker'],
  [['fuel', 'consumption', 'hfo', 'mdo', 'tank', 'gauge', 'bunker'], 'FuelGaugeCards'],
  [['crew', 'fatigue', 'stcw', 'certification', 'roster', 'officer'], 'CrewCertificationStatus'],
  [['alert', 'emergency', 'alarm', 'critical', 'warning'], 'AlertPanel'],
  [['weather', 'wave', 'wind', 'swell'], 'WeatherWidget'],
  [['engine', 'rpm', 'performance', 'machinery'], 'EngineMonitor'],
  [['kpi', 'efficiency', 'cii', 'performance metric'], 'KPIDashboard'],
];

/** Legacy aliases → canonical names */
export const WIDGET_ALIASES: Record<string, MaritimeWidget> = {
  VoyageTracker: 'VoyageProgressTracker',
  FuelAnalytics: 'FuelGaugeCards',
  CrewPanel: 'CrewCertificationStatus',
  AlertCenter: 'AlertPanel',
};

export function mapWidgets(text: string): MaritimeWidget[] {
  const lower = text.toLowerCase();
  const found: MaritimeWidget[] = [];

  for (const [keywords, widget] of KEYWORD_MAP) {
    if (keywords.some((k) => lower.includes(k))) {
      if (!found.includes(widget)) found.push(widget);
    }
  }

  if (found.length > 0) return found;

  return [
    'VoyageProgressTracker',
    'FuelGaugeCards',
    'CrewCertificationStatus',
    'AlertPanel',
  ];
}

export function normalizeWidgetName(name: string): string {
  return WIDGET_ALIASES[name] ?? name;
}

export function normalizeWidgetList(widgets: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of widgets) {
    const n = normalizeWidgetName(w);
    if (!seen.has(n)) {
      seen.add(n);
      result.push(n);
    }
  }
  return result;
}

/** Coerce API/store values into a widget name array */
export function asWidgetArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return normalizeWidgetList(
      value.map((w) => {
        if (typeof w === 'object' && w !== null && 'name' in w) {
          return String(w.name);
        }
        return String(w);
      })
    );
  }
  return fallback;
}
