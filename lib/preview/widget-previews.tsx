'use client';

import type { ComponentType, ReactNode } from 'react';
import { PreviewProvider, usePreviewData } from './preview-context';
import { normalizeWidgetName } from '@/lib/tools/widget-mapper';
import {
  dedupePreviewWidgets,
  pickCuratedPreview,
  shouldUseCuratedPreview,
} from './curated-widgets';
import { FuelGaugeVisual } from './fuel-gauge-visual';
import { VoyageRouteVisual } from './voyage-route-visual';
import { CrewStatusVisual } from './crew-status-visual';
import { AlertTimelineVisual } from './alert-timeline-visual';
import { EngineGaugeVisual } from './engine-gauge-visual';
import { SensorStreamVisual } from './sensor-stream-visual';
import { AISFeedVisual } from './ais-feed-visual';
import { GPSTrackVisual } from './gps-track-visual';

const WIDGET_LABELS: Record<string, { title: string; subtitle: (d: ReturnType<typeof usePreviewData>) => string }> = {
  VoyageProgressTracker: {
    title: 'Voyage Progress',
    subtitle: (d) => `${d.vesselName} · ${d.legLabel} · ${d.route}`,
  },
  FuelGaugeCards: {
    title: 'Fuel Gauges',
    subtitle: (d) => `${d.vesselName} · tank levels & burn rates`,
  },
  CrewCertificationStatus: {
    title: 'Crew Certification',
    subtitle: (d) => `${d.vesselName} · STCW compliance roster`,
  },
  AlertPanel: {
    title: 'Alert Panel',
    subtitle: (d) => `${d.alerts.length} active alarms · ${d.priority}`,
  },
  EngineMonitor: {
    title: 'Engine Monitor',
    subtitle: (d) => `${d.vesselName} · main engine parameters`,
  },
  SensorStreamPanel: {
    title: 'Sensor Stream',
    subtitle: (d) => `${d.vesselName} · SOG trend (24h)`,
  },
  AISLiveFeed: {
    title: 'AIS Live Feed',
    subtitle: (d) => `${d.vesselName} · position ${d.position}`,
  },
  GPSTracker: {
    title: 'GPS Tracker',
    subtitle: (d) => `${d.vesselName} · track history`,
  },
  KPIDashboard: {
    title: 'KPI Dashboard',
    subtitle: (d) => `${d.domain} · fleet performance`,
  },
  WeatherWidget: {
    title: 'Weather',
    subtitle: (d) => `Route · ${d.route}`,
  },
};

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5 shadow-lg shadow-black/30">
      <div className="mb-4 border-b border-white/5 pb-3">
        <h3 className="text-base font-semibold text-[rgb(var(--accent)/0.95)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function widgetMeta(widgetName: string, d: ReturnType<typeof usePreviewData>) {
  const canonical = normalizeWidgetName(widgetName);
  const meta = WIDGET_LABELS[canonical] ?? {
    title: widgetName.replace(/([A-Z])/g, ' $1').trim(),
    subtitle: () => d.vesselName,
  };
  return { title: meta.title, subtitle: meta.subtitle(d) };
}

function VoyageProgressTrackerPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  return (
    <CardShell title={title} subtitle={subtitle}>
      <VoyageRouteVisual data={d} />
    </CardShell>
  );
}

function FuelGaugeCardsPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  const hfoMdo = d.tanks.filter((t) => t.name === 'HFO' || t.name === 'MDO');
  const tanks = hfoMdo.length >= 2 ? hfoMdo : d.tanks;
  return (
    <CardShell title={title} subtitle={subtitle}>
      <FuelGaugeVisual tanks={tanks} vesselName={d.vesselName} />
    </CardShell>
  );
}

function CrewCertificationStatusPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  return (
    <CardShell title={title} subtitle={subtitle}>
      <CrewStatusVisual crew={d.crew} vesselName={d.vesselName} />
    </CardShell>
  );
}

function AlertPanelPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  const operationalAlerts = d.alerts.filter(
    (a) => !/crew|cert|stcw/i.test(a.msg) && !/machinery|engine/i.test(a.msg)
  );
  return (
    <CardShell title={title} subtitle={subtitle}>
      <AlertTimelineVisual alerts={operationalAlerts.length > 0 ? operationalAlerts : d.alerts} priority={d.priority} />
    </CardShell>
  );
}

function EngineMonitorPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  return (
    <CardShell title={title} subtitle={subtitle}>
      <EngineGaugeVisual rpm={d.engine.rpm} load={d.engine.load} health={d.engine.health} vesselName={d.vesselName} />
    </CardShell>
  );
}

function AISLiveFeedPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  const sog = `${12 + (d.progress % 8)} kn`;
  return (
    <CardShell title={title} subtitle={subtitle}>
      <AISFeedVisual vesselName={d.vesselName} position={d.position} sog={sog} cog="084°" />
    </CardShell>
  );
}

function GPSTrackerPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  const crumbs = ['1.2°N 103.4°E', '2.8°N 104.1°E', '3.3°N 104.8°E', `${d.position} 105.2°E`];
  return (
    <CardShell title={title} subtitle={subtitle}>
      <GPSTrackVisual vesselName={d.vesselName} route={d.route} breadcrumbs={crumbs} />
    </CardShell>
  );
}

function SensorStreamPanelPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  return (
    <CardShell title={title} subtitle={subtitle}>
      <SensorStreamVisual
        vesselName={d.vesselName}
        metric="Speed over ground"
        unit="kn"
        values={d.speedSeries}
      />
    </CardShell>
  );
}

function WeatherWidgetPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  return (
    <CardShell title={title} subtitle={subtitle}>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Wind', value: d.weather.wind, icon: '💨' },
          { label: 'Waves', value: d.weather.waves, icon: '🌊' },
          { label: 'Swell', value: d.weather.swell, icon: '〰' },
        ].map((w) => (
          <div key={w.label} className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4">
            <p className="text-lg">{w.icon}</p>
            <p className="text-xs text-slate-500">{w.label}</p>
            <p className="mt-1 text-base font-semibold text-slate-100">{w.value}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function KPIDashboardPreview({ widgetName }: { widgetName: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(widgetName, d);
  return (
    <CardShell title={title} subtitle={subtitle}>
      <div className="grid grid-cols-3 gap-3">
        {d.kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4 text-center">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-[rgb(var(--accent)/0.95)]">{k.value}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function GenericWidgetPreview({ name }: { name: string }) {
  const d = usePreviewData();
  const { title, subtitle } = widgetMeta(name, d);
  return (
    <CardShell title={title} subtitle={subtitle}>
      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[rgb(var(--accent)/0.3)] bg-[rgb(var(--accent)/0.05)] p-4 text-center">
        <svg className="mb-2 h-6 w-6 text-[rgb(var(--accent)/0.7)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <p className="text-sm font-semibold text-slate-200">Custom AI Widget Generated!</p>
        <p className="mt-1 max-w-[280px] text-xs text-slate-400">
          This widget's custom React code was successfully generated by the AI. Go to the <strong>Export</strong> tab to view or download the full React code.
        </p>
      </div>
    </CardShell>
  );
}

type PreviewProps = { widgetName: string };

const PREVIEW_MAP: Record<string, ComponentType<PreviewProps>> = {
  VoyageProgressTracker: VoyageProgressTrackerPreview,
  VoyageTracker: VoyageProgressTrackerPreview,
  AISLiveFeed: AISLiveFeedPreview,
  GPSTracker: GPSTrackerPreview,
  FuelGaugeCards: FuelGaugeCardsPreview,
  FuelAnalytics: FuelGaugeCardsPreview,
  CrewCertificationStatus: CrewCertificationStatusPreview,
  CrewPanel: CrewCertificationStatusPreview,
  AlertPanel: AlertPanelPreview,
  AlertCenter: AlertPanelPreview,
  EngineMonitor: EngineMonitorPreview,
  SensorStreamPanel: SensorStreamPanelPreview,
  KPIDashboard: KPIDashboardPreview,
  WeatherWidget: WeatherWidgetPreview,
};

export function WidgetPreview({ widgetName }: { widgetName: string }) {
  const canonical = normalizeWidgetName(widgetName);
  let Preview: ComponentType<PreviewProps> | null = PREVIEW_MAP[canonical] ?? PREVIEW_MAP[widgetName] ?? null;

  if (!Preview && shouldUseCuratedPreview(widgetName)) {
    Preview = pickCuratedPreview(widgetName, PREVIEW_MAP);
  }

  if (Preview) return <Preview widgetName={canonical} />;

  return <GenericWidgetPreview name={widgetName} />;
}

function DashboardPreviewInner({ widgets, components, prd }: { widgets: string[]; components?: Record<string, string>; prd: string }) {
  const d = usePreviewData();
  const uniqueWidgets = dedupePreviewWidgets(widgets);

  if (uniqueWidgets.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 p-8 text-center">
        <p className="text-sm text-slate-400">Add widgets to your spec to see a live preview</p>
        <p className="text-xs text-slate-500">Detected: {d.widgets.join(', ') || 'none yet'}</p>
      </div>
    );
  }



  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{d.title}</h2>
          <p className="font-mono text-xs uppercase tracking-wider text-slate-500 mt-2">Live Preview</p>
        </div>

      </div>
      <div className="columns-1 xl:columns-2 2xl:columns-3 gap-6">
        {uniqueWidgets.map((w) => (
          <div key={w} className="break-inside-avoid mb-6 flex flex-col min-w-0 overflow-hidden">
            <WidgetPreview widgetName={w} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPreview({
  widgets,
  prd,
  schema,
  components,
}: {
  widgets: string[];
  prd: string;
  schema?: { domain?: string; layout?: string; priority?: string; widgets?: string[] } | null;
  components?: Record<string, string>;
}) {
  return (
    <PreviewProvider prd={prd} schema={schema}>
      <DashboardPreviewInner widgets={widgets} components={components} prd={prd} />
    </PreviewProvider>
  );
}
