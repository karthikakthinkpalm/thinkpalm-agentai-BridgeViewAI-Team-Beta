import type { ParsedSchema } from '@/lib/types/pipeline';

export interface HierarchyNode {
  id: string;
  label: string;
  type: 'root' | 'layout' | 'widget';
  description?: string;
  children?: HierarchyNode[];
}

const WIDGET_META: Record<string, { label: string; description: string }> = {
  VoyageProgressTracker: {
    label: 'Voyage Progress Tracker',
    description: 'Route leg progress, ETA, distance remaining, AIS position',
  },
  FuelGaugeCards: {
    label: 'Fuel Gauge Cards',
    description: 'HFO/MDO tank levels, burn rate, days remaining',
  },
  CrewCertificationStatus: {
    label: 'Crew Certification Status',
    description: 'STCW compliance, cert expiry, roster badges',
  },
  AlertPanel: {
    label: 'Alert Panel',
    description: 'Prioritized critical/warning/info alerts with ack',
  },
  VoyageTracker: {
    label: 'Voyage Progress Tracker',
    description: 'Route tracking and progress visualization',
  },
  FuelAnalytics: {
    label: 'Fuel Gauge Cards',
    description: 'Fuel consumption and tank analytics',
  },
  CrewPanel: {
    label: 'Crew Certification Status',
    description: 'Crew roster and certification panel',
  },
  AlertCenter: {
    label: 'Alert Panel',
    description: 'Emergency and operational alert center',
  },
  WeatherWidget: {
    label: 'Weather Widget',
    description: 'Wind, waves, and swell for active route',
  },
  EngineMonitor: {
    label: 'Engine Monitor',
    description: 'RPM, load, and machinery health',
  },
  KPIDashboard: {
    label: 'KPI Dashboard',
    description: 'CII and efficiency performance metrics',
  },
};

export function buildWidgetHierarchy(schema: ParsedSchema): HierarchyNode {
  const widgetNodes: HierarchyNode[] = schema.widgets.map((w) => {
    const selected = schema.selectedWidgets?.find((s) => s.name === w.name);
    const vizSummary = selected
      ? `${selected.visualization} — ${selected.reason}`
      : w.recommendations?.[0]
        ? `${w.recommendations[0].visualization} — ${w.recommendations[0].reason}`
        : w.description;
    const zoneLabel = w.zone ? ` [${w.zone}]` : '';
    return {
      id: w.name,
      label: w.name.replace(/([A-Z])/g, ' $1').trim(),
      type: 'widget' as const,
      description: `${vizSummary}${zoneLabel}`,
    };
  });

  return {
    id: 'maritime-dashboard',
    label: 'Maritime Bridge Dashboard',
    type: 'root',
    description: `${schema.domain} · ${schema.priority} priority`,
    children: [
      {
        id: 'layout',
        label: schema.layout.replace(/-/g, ' '),
        type: 'layout',
        description: `Layout pattern: ${schema.layout}`,
        children: widgetNodes,
      },
    ],
  };
}
