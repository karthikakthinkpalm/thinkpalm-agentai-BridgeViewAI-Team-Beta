import { mapWidgets, normalizeWidgetList, asWidgetArray } from '@/lib/tools/widget-mapper';

export interface PreviewTank {
  name: string;
  pct: number;
  rate: string;
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

  if (lower.includes('hfo') || lower.includes('fuel') || lower.includes('bunker')) {
    tanks.push({
      name: 'HFO',
      pct: seededInt(vessel + 'hfo', 55, 88),
      rate: `${(seededInt(vessel + 'hfor', 12, 22) / 10).toFixed(1)} t/d`,
    });
  }
  if (lower.includes('mdo') || lower.includes('diesel') || lower.includes('fuel')) {
    tanks.push({
      name: 'MDO',
      pct: seededInt(vessel + 'mdo', 30, 75),
      rate: `${(seededInt(vessel + 'mdor', 3, 8) / 10).toFixed(1)} t/d`,
    });
  }
  if (lower.includes('lng') || lower.includes('boil-off') || lower.includes('gas')) {
    tanks.push({
      name: 'BOG',
      pct: seededInt(vessel + 'bog', 40, 80),
      rate: `${seededInt(vessel + 'bogr', 8, 15)} m³/d`,
    });
  }
  if (tanks.length === 0) {
    return [
      { name: 'HFO', pct: 72, rate: '18.2 t/d' },
      { name: 'MDO', pct: 45, rate: '4.1 t/d' },
    ];
  }
  if (!tanks.some((t) => t.name === 'LO') && tanks.length < 3) {
    tanks.push({ name: 'LO', pct: seededInt(vessel + 'lo', 70, 95), rate: '0.3 t/d' });
  }
  return tanks.slice(0, 3);
}

function buildAlerts(text: string, priority: string): PreviewAlert[] {
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
  if (lower.includes('engine') || lower.includes('machinery') || lower.includes('fuel temp')) {
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
  if (lower.includes('weather') || lower.includes('route')) {
    alerts.push({
      level: 'info',
      msg: 'Weather routing update along active leg',
      time: '1h ago',
    });
  }
  if (lower.includes('crew') || lower.includes('stcw') || lower.includes('cert')) {
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

  const progress = seededInt(prd + vesselName, 42, 88);
  const totalLegs = seededInt(vesselName + 'legs', 3, 6);
  const currentLeg = seededInt(vesselName + 'leg', 1, totalLegs);

  return {
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
    alerts: buildAlerts(prd, priority),
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
  };
}
