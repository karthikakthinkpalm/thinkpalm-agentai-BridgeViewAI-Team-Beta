import type { LayoutPlan, LayoutPlacement, LayoutZone, RequirementAnalysis, SelectedWidget } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';

const ALERT_WIDGETS = new Set(['AlertPanel', 'AlertCenter']);
const HERO_WIDGETS = new Set(['VoyageProgressTracker', 'VoyageTracker', 'AISLiveFeed', 'GPSTracker']);
const WEATHER_WIDGETS = new Set(['WeatherWidget']);
const MACHINERY_WIDGETS = new Set(['EngineMonitor', 'SensorStreamPanel']);
const FUEL_WIDGETS = new Set(['FuelGaugeCards', 'FuelAnalytics']);
const COMPLIANCE_WIDGETS = new Set(['CrewCertificationStatus', 'CrewPanel']);
const REPORT_WIDGETS = new Set(['KPIDashboard']);

/** BridgeView layout priority: alerts → navigation → weather → machinery → fuel → compliance → reports */
const LAYOUT_PRIORITY: Record<string, number> = {
  AlertPanel: 0,
  AlertCenter: 0,
  VoyageProgressTracker: 1,
  VoyageTracker: 1,
  AISLiveFeed: 1,
  GPSTracker: 1,
  WeatherWidget: 2,
  EngineMonitor: 3,
  SensorStreamPanel: 3,
  FuelGaugeCards: 4,
  FuelAnalytics: 4,
  CrewCertificationStatus: 5,
  CrewPanel: 5,
  KPIDashboard: 6,
};

function pickPattern(requirements: RequirementAnalysis, widgets: SelectedWidget[]): LayoutPlan['pattern'] {
  if (requirements.priority === 'safety-critical') return 'alert-first';
  if (widgets.some((w) => HERO_WIDGETS.has(w.name))) return 'bridge-split';
  return 'dashboard-grid';
}

function zoneFor(widget: string, priority: string): LayoutZone {
  if (ALERT_WIDGETS.has(widget)) return priority === 'safety-critical' ? 'alert-strip' : 'primary';
  if (HERO_WIDGETS.has(widget)) return 'hero';
  if (WEATHER_WIDGETS.has(widget) || COMPLIANCE_WIDGETS.has(widget)) return 'sidebar';
  if (MACHINERY_WIDGETS.has(widget) || FUEL_WIDGETS.has(widget) || REPORT_WIDGETS.has(widget)) return 'secondary';
  return 'secondary';
}

export interface Agent4Result {
  layoutPlan: LayoutPlan;
  prompts: PromptRecord[];
}

export function runAgent4LayoutPlanner(
  requirements: RequirementAnalysis,
  selectedWidgets: SelectedWidget[]
): Agent4Result {
  const pattern = pickPattern(requirements, selectedWidgets);

  const sorted = [...selectedWidgets].sort((a, b) => {
    const zoneOrder: Record<LayoutZone, number> = {
      'alert-strip': 0,
      hero: 1,
      primary: 2,
      secondary: 3,
      sidebar: 4,
    };
    const za = zoneOrder[zoneFor(a.name, requirements.priority)];
    const zb = zoneOrder[zoneFor(b.name, requirements.priority)];
    const pa = LAYOUT_PRIORITY[a.name] ?? 99;
    const pb = LAYOUT_PRIORITY[b.name] ?? 99;
    return za - zb || pa - pb || b.confidence - a.confidence;
  });

  const placements: LayoutPlacement[] = sorted.map((w, i) => {
    const zone = zoneFor(w.name, requirements.priority);
    return {
      widget: w.name,
      zone,
      row: zone === 'hero' ? 0 : zone === 'alert-strip' ? 0 : Math.floor(i / 2) + 1,
      order: i,
      rationale:
        zone === 'alert-strip'
          ? 'Safety-critical alerts placed in top alert strip for immediate visibility'
          : zone === 'hero'
            ? 'Primary navigation/voyage context occupies hero zone above fold'
            : zone === 'sidebar'
              ? 'Supporting roster/environmental data in sidebar column'
              : 'Operational metrics in secondary grid for scanability',
    };
  });

  const layoutPlan: LayoutPlan = {
    pattern,
    placements,
    rationale: `Layout pattern "${pattern}" chosen for ${requirements.priority} priority ${requirements.domain} dashboard with ${selectedWidgets.length} widgets.`,
  };

  const prompts: PromptRecord[] = [
    {
      id: 'a4-layout',
      agent: 'AGENT 4',
      role: 'system',
      label: 'Layout Planner — Dashboard Placement',
      content: JSON.stringify(layoutPlan, null, 2),
      techniques: ['Zone-based placement', 'Safety-first ordering', 'Bridge UX patterns'],
    },
  ];

  return { layoutPlan, prompts };
}
