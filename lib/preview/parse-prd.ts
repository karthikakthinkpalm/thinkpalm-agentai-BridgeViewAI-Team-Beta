import { mapWidgets, normalizeWidgetList, normalizeWidgetName, asWidgetArray } from '@/lib/tools/widget-mapper';

export interface PreviewTank {
  name: string;
  pct: number;
  rate: string;
  daysRemaining: number;
  capacity: string;
}

export interface PreviewCrewMember {
  name: string;
  role: string;
  status: 'valid' | 'expiring';
  exp: string;
}

export interface PreviewAlert {
  level: 'critical' | 'warning' | 'info';
  msg: string;
  time: string;
}

export interface PreviewContextData {
  title: string;
  vesselName: string;
  domain: string;
  layout: string;
  priority: string;
  widgets: string[];
  route: string;
  progress: number;
  legLabel: string;
  eta: string;
  remaining: string;
  position: string;
  tanks: PreviewTank[];
  crew: PreviewCrewMember[];
  alerts: PreviewAlert[];
  weather: { wind: string; waves: string; swell: string };
  engine: { rpm: string; load: string; health: string };
  kpis: { label: string; value: string }[];
  speedSeries: number[];
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededInt(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) % (max - min + 1));
}

function extractVesselName(text: string): string {
  const patterns = [
    /(?:for|vessel:?)\s+(MV\s+[^\n.,]+)/i,
    /(MV\s+[A-Za-z][A-Za-z0-9\s-]{2,})/i,
    /(?:ship|ferry|carrier)\s+([A-Z][A-Za-z0-9\s-]{3,})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim().replace(/\s+/g, ' ');
  }
  return 'MV Unnamed';
}

function extractTitle(text: string): string {
  const match = text.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return 'Live Dashboard Preview';
}

function extractRoute(text: string, vessel: string): string {
  const arrow = text.match(/([A-Za-z][\w\s]{2,}?)\s*(?:→|->|to)\s*([A-Za-z][\w\s]{2,})/i);
  if (arrow) return `${arrow[1].trim()} → ${arrow[2].trim()}`;

  const ports = [...text.matchAll(/\b(Rotterdam|Singapore|Hamburg|Dubai|Oslo|Bergen|Houston|Panama|Suez)\b/gi)];
  if (ports.length >= 2) {
    return `${ports[0][1]} → ${ports[1][1]}`;
  }

  const lower = text.toLowerCase();
  if (lower.includes('lng') || lower.includes('ballast')) return 'Qatar → Rotterdam';
  if (lower.includes('ferry') || lower.includes('passenger')) return 'Port A → Port B';
  if (lower.includes('fleet') || lower.includes('hq')) return 'Fleet overview';
  return `Open sea · ${vessel}`;
}

function extractField(text: string, key: string, fallback: string): string {
  const m = text.match(new RegExp(`${key}\\s*[:.]?\\s*([\\w-]+)`, 'i'));
  return m?.[1]?.trim() ?? fallback;
}

function buildTanks(text: string, vessel: string): PreviewTank[] {
  const lower = text.toLowerCase();
  const tanks: PreviewTank[] = [];

  const tank = (name: string, pct: number, daily: number, cap: string): PreviewTank => ({
    name,
    pct,
    rate: `${daily.toFixed(1)} t/d`,
    capacity: cap,
    daysRemaining: Math.max(3, Math.round(((pct / 100) * parseInt(cap, 10)) / daily)),
  });

  if (lower.includes('hfo') || lower.includes('fuel') || lower.includes('bunker')) {
    tanks.push(tank('HFO', seededInt(vessel + 'hfo', 55, 88), seededInt(vessel + 'hfor', 12, 22) / 10, '800 m³'));
  }
  if (lower.includes('mdo') || lower.includes('diesel') || lower.includes('fuel')) {
    tanks.push(tank('MDO', seededInt(vessel + 'mdo', 30, 75), seededInt(vessel + 'mdor', 3, 8) / 10, '200 m³'));
  }
  if (lower.includes('lng') || lower.includes('boil-off') || lower.includes('gas')) {
    tanks.push(tank('BOG', seededInt(vessel + 'bog', 40, 80), seededInt(vessel + 'bogr', 8, 15), '1200 m³'));
  }
  if (tanks.length === 0) {
    return [tank('HFO', 72, 18.2, '800 m³'), tank('MDO', 45, 4.1, '200 m³')];
  }
  if (!tanks.some((t) => t.name === 'LO') && tanks.length < 3) {
    tanks.push(tank('LO', seededInt(vessel + 'lo', 70, 95), 0.3, '45 m³'));
  }
  return tanks.slice(0, 3);
}

function hasWidget(activeWidgets: string[], ...names: string[]): boolean {
  const set = new Set(activeWidgets.map((w) => normalizeWidgetName(w)));
  return names.some((n) => set.has(normalizeWidgetName(n)));
}

function buildAlerts(text: string, priority: string, activeWidgets: string[]): PreviewAlert[] {
  const lower = text.toLowerCase();
  const alerts: PreviewAlert[] = [];

  if (lower.includes('emergency') || lower.includes('steering') || priority.includes('safety')) {
    alerts.push({
      level: 'critical',
      msg: lower.includes('steering')
        ? 'Steering gear fault — standby pump'
        : 'Safety system fault — immediate review',
      time: '2m ago',
    });
  }
  if (
    !hasWidget(activeWidgets, 'EngineMonitor') &&
    (lower.includes('engine') || lower.includes('machinery') || lower.includes('fuel temp'))
  ) {
    alerts.push({
      level: 'warning',
      msg: lower.includes('engine')
        ? 'Main engine exhaust temp elevated'
        : 'Machinery parameter approaching limit',
      time: '18m ago',
    });
  }
  if (lower.includes('navigation') || lower.includes('ecdis') || lower.includes('cpa')) {
    alerts.push({
      level: 'warning',
      msg: 'Navigation warning — CPA/TCPA threshold',
      time: '24m ago',
    });
  }
  if (
    !hasWidget(activeWidgets, 'VoyageProgressTracker', 'WeatherWidget') &&
    (lower.includes('weather') || lower.includes('route'))
  ) {
    alerts.push({
      level: 'info',
      msg: 'Weather routing update along active leg',
      time: '1h ago',
    });
  }
  if (
    !hasWidget(activeWidgets, 'CrewCertificationStatus', 'CrewPanel') &&
    (lower.includes('crew') || lower.includes('stcw') || lower.includes('cert'))
  ) {
    alerts.push({
      level: 'info',
      msg: 'Crew certificate expiry within 90 days',
      time: '3h ago',
    });
  }

  if (alerts.length === 0) {
    return [
      { level: 'warning', msg: 'Monitor active alarms from spec', time: '12m ago' },
      { level: 'info', msg: 'Dashboard generated from your PRD', time: 'Just now' },
    ];
  }
  return alerts.slice(0, 4);
}

function buildCrew(text: string, vessel: string): PreviewCrewMember[] {
  const lower = text.toLowerCase();
  const expiring = lower.includes('expir') || lower.includes('90 day');
  return [
    { name: 'Capt. Hansen', role: 'Master', status: 'valid', exp: '2027-03' },
    {
      name: 'O. Martinez',
      role: lower.includes('engine') ? 'Chief Eng.' : 'Chief Off.',
      status: 'valid',
      exp: '2026-11',
    },
    {
      name: 'J. Okonkwo',
      role: lower.includes('ferry') ? 'Safety Off.' : '2nd Off.',
      status: expiring ? 'expiring' : 'valid',
      exp: expiring ? '2025-07' : '2027-01',
    },
  ];
}

export function parsePrdForPreview(prd: string, schema?: { domain?: string; layout?: string; priority?: string; widgets?: string[] } | null): PreviewContextData {
  const vesselName = extractVesselName(prd);
  const layout = schema?.layout ?? extractField(prd, 'layout', 'dashboard-grid');
  const priority = schema?.priority ?? extractField(prd, 'priority', 'operational');
  const domain = schema?.domain ?? (prd.toLowerCase().includes('fleet') ? 'fleet operations' : 'vessel monitoring');
  const widgets = Array.isArray(schema?.widgets) && schema.widgets.length > 0
    ? asWidgetArray(schema.widgets)
    : normalizeWidgetList(mapWidgets(prd));

  const sogBase = seededInt(prd + vesselName + 'sog', 10, 16);
  const speedSeries = Array.from({ length: 12 }, (_, i) =>
    Math.max(8, sogBase + seededInt(prd + `sp${i}`, -2, 3))
  );

  const progress = seededInt(prd + vesselName, 42, 88);
  const totalLegs = seededInt(vesselName + 'legs', 3, 6);
  const currentLeg = seededInt(vesselName + 'leg', 1, totalLegs);

  return {
    title: extractTitle(prd),
    vesselName,
    domain,
    layout,
    priority,
    widgets,
    route: extractRoute(prd, vesselName),
    progress,
    legLabel: `Leg ${currentLeg} of ${totalLegs}`,
    eta: `${seededInt(prd + 'eta', 10, 28)} Jun`,
    remaining: `${seededInt(prd + 'nm', 1200, 4200).toLocaleString()} nm`,
    position: `${(seededInt(prd + 'lat', 5, 45) / 10).toFixed(1)}°N`,
    tanks: buildTanks(prd, vesselName),
    crew: buildCrew(prd, vesselName),
    alerts: buildAlerts(prd, priority, widgets),
    weather: {
      wind: `${seededInt(prd + 'wind', 12, 28)} kn`,
      waves: `${(seededInt(prd + 'wave', 15, 35) / 10).toFixed(1)} m`,
      swell: `${['N', 'NE', 'E', 'SE'][seededInt(prd + 'swell', 0, 3)]} ${seededInt(prd + 'sw', 1, 3)} m`,
    },
    engine: {
      rpm: `${seededInt(prd + 'rpm', 72, 98)}`,
      load: `${seededInt(prd + 'load', 55, 92)}%`,
      health: priority.includes('safety') ? 'Watch' : 'Normal',
    },
    kpis: [
      { label: 'CII', value: ['A', 'B', 'C'][seededInt(prd + 'cii', 0, 2)] },
      { label: 'Fuel eff.', value: `${seededInt(prd + 'eff', 82, 96)}%` },
      { label: 'On-time', value: `${seededInt(prd + 'ot', 88, 99)}%` },
    ],
    speedSeries,
  };
}
