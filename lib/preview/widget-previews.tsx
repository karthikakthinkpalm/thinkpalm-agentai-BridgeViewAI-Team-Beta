'use client';

import type { ComponentType, ReactNode } from 'react';
import { PreviewProvider, usePreviewData } from './preview-context';

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

function VoyageProgressTrackerPreview() {
  const d = usePreviewData();
  const stats = [
    { label: 'ETA', value: d.eta },
    { label: 'Remaining', value: d.remaining },
    { label: 'Position', value: d.position },
  ];

  return (
    <CardShell title="Voyage Progress" subtitle={`${d.vesselName} · ${d.legLabel}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-slate-300">
          <span>{d.route}</span>
          <span className="text-base font-bold text-[rgb(var(--accent)/0.95)]">{d.progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full"
            style={{
              width: `${d.progress}%`,
              background: 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent-2)))',
            }}
          />
        </div>
        <div className="space-y-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between gap-4 rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-slate-400">{stat.label}</span>
              <span className="font-semibold text-slate-100">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

function FuelGaugeCardsPreview() {
  const d = usePreviewData();
  const colors = [
    'from-amber-500 to-orange-500',
    'from-[rgb(var(--accent))] to-[rgb(var(--accent-2))]',
    'from-blue-500 to-cyan-500',
  ];

  return (
    <CardShell title="Fuel Gauges" subtitle={`${d.vesselName} · tank levels`}>
      <div className="grid grid-cols-3 gap-5">
        {d.tanks.map((t, i) => (
          <div
            key={t.name}
            className="flex flex-col items-center rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4"
          >
            <span className="text-sm font-semibold text-slate-200">{t.name}</span>
            <span className="mt-1 text-base font-bold text-[rgb(var(--accent)/0.95)]">{t.pct}%</span>
            <div className="mt-3 flex h-28 w-full max-w-[5rem] items-end overflow-hidden rounded-lg bg-slate-800">
              <div
                className={`w-full rounded-b-md bg-gradient-to-t ${colors[i % colors.length]}`}
                style={{ height: `${t.pct}%` }}
              />
            </div>
            <span className="mt-2 text-sm text-slate-400">{t.rate}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function CrewCertificationStatusPreview() {
  const d = usePreviewData();
  return (
    <CardShell title="Crew Certification" subtitle={`${d.vesselName} · STCW`}>
      <ul className="space-y-2">
        {d.crew.map((c) => (
          <li
            key={c.name}
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-slate-950/50 px-4 py-3 text-sm"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                c.status === 'valid' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-100">{c.name}</div>
              <div className="text-slate-400">{c.role}</div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                c.status === 'valid'
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-amber-400/15 text-amber-300'
              }`}
            >
              {c.exp}
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

function AlertPanelPreview() {
  const d = usePreviewData();
  const tones: Record<string, string> = {
    critical: 'border-rose-500/50 bg-rose-500/10 text-rose-100',
    warning: 'border-amber-500/50 bg-amber-500/10 text-amber-100',
    info: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
  };
  return (
    <CardShell title="Alert Panel" subtitle={`${d.alerts.length} active · ${d.priority}`}>
      <ul className="space-y-2">
        {d.alerts.map((a) => (
          <li
            key={a.msg}
            className={`rounded-lg border px-4 py-3 text-sm ${tones[a.level]}`}
          >
            <div className="flex justify-between gap-2 text-xs font-medium uppercase tracking-wide opacity-80">
              <span>{a.level}</span>
              <span>{a.time}</span>
            </div>
            <p className="mt-1.5 leading-snug">{a.msg}</p>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

function WeatherWidgetPreview() {
  const d = usePreviewData();
  return (
    <CardShell title="Weather" subtitle={`Route · ${d.route}`}>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Wind', value: d.weather.wind },
          { label: 'Waves', value: d.weather.waves },
          { label: 'Swell', value: d.weather.swell },
        ].map((w) => (
          <div key={w.label} className="rounded-lg bg-slate-800/80 px-3 py-4">
            <p className="text-xs text-slate-500">{w.label}</p>
            <p className="mt-1 text-base font-semibold text-slate-100">{w.value}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function EngineMonitorPreview() {
  const d = usePreviewData();
  return (
    <CardShell title="Engine Monitor" subtitle={d.vesselName}>
      <div className="space-y-3">
        {[
          { label: 'RPM', value: d.engine.rpm },
          { label: 'Load', value: d.engine.load },
          { label: 'Health', value: d.engine.health },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg bg-slate-800/80 px-4 py-3 text-sm"
          >
            <span className="text-slate-400">{row.label}</span>
            <span className="font-semibold text-slate-100">{row.value}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function KPIDashboardPreview() {
  const d = usePreviewData();
  return (
    <CardShell title="KPI Dashboard" subtitle={d.domain}>
      <div className="grid grid-cols-3 gap-3">
        {d.kpis.map((k) => (
          <div key={k.label} className="rounded-lg bg-slate-800/80 px-3 py-4 text-center">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="mt-1 text-xl font-bold text-[rgb(var(--accent)/0.95)]">{k.value}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function GenericWidgetPreview({ name }: { name: string }) {
  const d = usePreviewData();
  return (
    <CardShell title={name} subtitle={d.vesselName}>
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
        From spec: {d.domain}
      </div>
    </CardShell>
  );
}

const PREVIEW_MAP: Record<string, ComponentType> = {
  VoyageProgressTracker: VoyageProgressTrackerPreview,
  VoyageTracker: VoyageProgressTrackerPreview,
  FuelGaugeCards: FuelGaugeCardsPreview,
  FuelAnalytics: FuelGaugeCardsPreview,
  CrewCertificationStatus: CrewCertificationStatusPreview,
  CrewPanel: CrewCertificationStatusPreview,
  AlertPanel: AlertPanelPreview,
  AlertCenter: AlertPanelPreview,
  WeatherWidget: WeatherWidgetPreview,
  EngineMonitor: EngineMonitorPreview,
  KPIDashboard: KPIDashboardPreview,
};

export function WidgetPreview({ widgetName }: { widgetName: string }) {
  const Preview = PREVIEW_MAP[widgetName] ?? (() => <GenericWidgetPreview name={widgetName} />);
  return <Preview />;
}

function DashboardPreviewInner({ widgets }: { widgets: string[] }) {
  if (widgets.length === 0) {
    const d = usePreviewData();
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 p-8 text-center">
        <p className="text-sm text-slate-400">Add widgets to your spec to see a live preview</p>
        <p className="text-xs text-slate-500">Detected: {d.widgets.join(', ') || 'none yet'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-slate-500">
        Live preview from your spec — updates as you edit the PRD
      </p>
      {widgets.map((w) => (
        <div key={w} className="animate-fade-in w-full">
          <WidgetPreview widgetName={w} />
        </div>
      ))}
    </div>
  );
}

export function DashboardPreview({
  widgets,
  prd,
  schema,
}: {
  widgets: string[];
  prd: string;
  schema?: { domain?: string; layout?: string; priority?: string; widgets?: string[] } | null;
}) {
  return (
    <PreviewProvider prd={prd} schema={schema}>
      <DashboardPreviewInner widgets={widgets} />
    </PreviewProvider>
  );
}
