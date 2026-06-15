import type { PreviewContextData, PreviewTank, PreviewAlert, PreviewCrewMember } from './parse-prd';
import { normalizeWidgetName } from '@/lib/tools/widget-mapper';
import { dedupePreviewWidgets, previewIdentity } from './curated-widgets';
import type { Project } from '@stackblitz/sdk';

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function shell(widgetName: string, title: string, subtitle: string, body: string): string {
  return `import React from 'react';

export default function ${widgetName}() {
  return (
    <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 shadow-lg shadow-black/30">
      <div className="mb-4 border-b border-white/5 pb-3">
        <h3 className="text-base font-semibold text-sky-400">${esc(title)}</h3>
        <p className="mt-0.5 text-sm text-slate-400">${esc(subtitle)}</p>
      </div>
      <div className="flex-1">
${body}
      </div>
    </div>
  );
}`;
}

const WIDGET_LABELS: Record<string, { title: string; subtitle: (d: PreviewContextData) => string }> = {
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

function widgetMeta(widgetName: string, d: PreviewContextData) {
  const canonical = normalizeWidgetName(widgetName);
  const meta = WIDGET_LABELS[canonical] ?? {
    title: widgetName.replace(/([A-Z])/g, ' $1').trim(),
    subtitle: () => d.vesselName,
  };
  return { title: meta.title, subtitle: meta.subtitle(d) };
}

function tankCard(t: PreviewTank, i: number): string {
  const grad = t.pct >= 60 ? 'from-emerald-500 to-teal-400' : t.pct >= 30 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400';
  const tc = t.pct >= 60 ? 'text-emerald-400' : t.pct >= 30 ? 'text-amber-400' : 'text-rose-400';
  return `            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
              <div className="mb-3 flex justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">${esc(t.name)} Tank</p>
                  <p className="text-xs text-slate-500">${esc(t.capacity)}</p>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[0.65rem] font-medium ${tc}">${t.daysRemaining}d left</span>
              </div>
              <div className="flex gap-4">
                <div className="relative flex h-32 w-14 shrink-0 flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                  <div className="w-full rounded-b-md bg-gradient-to-t ${grad}" style={{ height: '${t.pct}%' }} />
                  <span className="absolute inset-x-0 bottom-1 text-center text-[0.6rem] font-bold text-white">${t.pct}%</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">Burn rate</span><span className="text-slate-200">${esc(t.rate)}</span></div>
                  <div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r ${grad}" style={{ width: '${t.pct}%' }} /></div>
                </div>
              </div>
            </div>`;
}

function voyageBody(d: PreviewContextData): string {
  const sog = 12 + (d.progress % 8);
  const dash = Math.round((d.progress / 100) * 94);
  return `        <div className="grid gap-4 lg:grid-cols-5">
          <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-[#061018] lg:col-span-3">
            <div className="border-b border-white/5 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-widest text-cyan-400/80">ECDIS Route Map</p>
              <p className="text-xs font-semibold text-slate-200">${esc(d.vesselName)} · ${esc(d.legLabel)}</p>
            </div>
            <svg viewBox="0 0 100 72" className="h-56 w-full">
              <defs><linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0a1628" /><stop offset="100%" stopColor="#0c2340" /></linearGradient></defs>
              <rect width="100" height="72" fill="url(#ocean)" />
              <path d="M 14 38 C 30 20, 55 55, 78 72" fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="1.5 1" />
              <path d="M 14 38 C 30 20, 55 55, 78 72" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="${d.progress} 100" />
              <circle cx="14" cy="38" r="2.5" fill="#10b981" />
              <circle cx="78" cy="72" r="2.5" fill="#f59e0b" />
              <polygon points="48,42 46,46 50,46" fill="#e0f2fe" stroke="#22d3ee" strokeWidth="0.3" />
            </svg>
          </div>
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/60 p-3">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="${dash} 94" strokeLinecap="round" />
                </svg>
                <span className="text-xs font-bold text-white">${d.progress}%</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">${esc(d.route)}</p>
                <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: '${d.progress}%' }} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">ETA</p><p className="font-semibold text-slate-100">${esc(d.eta)}</p></div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">Remaining</p><p className="font-semibold text-slate-100">${esc(d.remaining)}</p></div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">Position</p><p className="font-semibold text-slate-100">${esc(d.position)}</p></div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">SOG</p><p className="font-semibold text-slate-100">${sog} kn</p></div>
            </div>
          </div>
        </div>`;
}

function fuelBody(d: PreviewContextData): string {
  const hfoMdo = d.tanks.filter((t) => t.name === 'HFO' || t.name === 'MDO');
  const tanks = hfoMdo.length >= 2 ? hfoMdo : d.tanks;
  const cards = tanks.map((t, i) => tankCard(t, i)).join('\n');
  const bars = tanks
    .map(
      (t) => `              <div className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end rounded-t bg-slate-800/80">
                  <div className="w-full bg-gradient-to-t from-emerald-500 to-teal-400" style={{ height: '${t.pct}%' }} />
                </div>
                <span className="text-[0.6rem] text-slate-400">${esc(t.name)}</span>
              </div>`
    )
    .join('\n');
  return `        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">${cards}</div>
          <div className="rounded-xl border border-white/5 bg-slate-900/50 p-3">
            <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-500">Fleet overview · ${esc(d.vesselName)}</p>
            <div className="flex h-20 items-end gap-2">${bars}</div>
          </div>
        </div>`;
}

function alertRow(a: PreviewAlert, i: number): string {
  const styles = {
    critical: { bar: 'bg-rose-500', card: 'border-rose-500/40 bg-rose-500/10', text: 'text-rose-200', icon: '!' },
    warning: { bar: 'bg-amber-500', card: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-200', icon: '⚠' },
    info: { bar: 'bg-sky-500', card: 'border-sky-500/40 bg-sky-500/10', text: 'text-sky-200', icon: 'i' },
  }[a.level];
  return `              <li className="relative flex gap-3">
                <span className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-bold text-white ${styles.bar}">${styles.icon}</span>
                <div className="flex-1 rounded-lg border px-3 py-2.5 ${styles.card}">
                  <div className="flex justify-between text-[0.6rem] font-medium uppercase tracking-wide opacity-70"><span>${a.level}</span><span>${esc(a.time)}</span></div>
                  <p className="mt-1 text-sm leading-snug ${styles.text}">${esc(a.msg)}</p>
                </div>
              </li>`;
}

function alertBody(d: PreviewContextData): string {
  const operational = d.alerts.filter((a) => !/crew|cert|stcw|machinery|engine/i.test(a.msg));
  const alerts = operational.length > 0 ? operational : d.alerts;
  const counts = {
    critical: alerts.filter((a) => a.level === 'critical').length,
    warning: alerts.filter((a) => a.level === 'warning').length,
    info: alerts.filter((a) => a.level === 'info').length,
  };
  const rows = alerts.map(alertRow).join('\n');
  return `        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center"><p className="text-lg font-bold text-rose-200">${counts.critical}</p><p className="text-[0.6rem] uppercase text-rose-300/80">Critical</p></div>
            <div className="flex-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center"><p className="text-lg font-bold text-amber-200">${counts.warning}</p><p className="text-[0.6rem] uppercase text-amber-300/80">Warning</p></div>
            <div className="flex-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-center"><p className="text-lg font-bold text-sky-200">${counts.info}</p><p className="text-[0.6rem] uppercase text-sky-300/80">Info</p></div>
          </div>
          <div className="relative pl-4">
            <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-slate-700" />
            <ul className="space-y-3">${rows}</ul>
          </div>
          <p className="text-center text-[0.65rem] text-slate-500">Priority context: ${esc(d.priority)}</p>
        </div>`;
}

function crewRow(c: PreviewCrewMember): string {
  const valid = c.status === 'valid';
  const dotClass = valid ? 'bg-emerald-400' : 'bg-amber-400';
  const badgeClass = valid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300';
  const label = valid ? 'Valid' : 'Expiring';
  return `            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800">
                <span className="h-2.5 w-2.5 rounded-full ${dotClass}" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">${esc(c.name)}</p>
                <p className="text-xs text-slate-400">${esc(c.role)}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${badgeClass}">${label}</span>
                <p className="mt-0.5 text-[0.6rem] text-slate-500">${esc(c.exp)}</p>
              </div>
            </div>`;
}

function crewBody(d: PreviewContextData): string {
  const valid = d.crew.filter((c) => c.status === 'valid').length;
  const pct = Math.round((valid / d.crew.length) * 100);
  const dash = Math.round((pct / 100) * 94);
  const rows = d.crew.map(crewRow).join('\n');
  return `        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="${dash} 94" strokeLinecap="round" />
              </svg>
              <span className="text-xs font-bold text-emerald-300">${pct}%</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">STCW Compliance</p>
              <p className="text-xs text-slate-400">${esc(d.vesselName)} · ${valid}/${d.crew.length} valid certificates</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">${rows}</div>
        </div>`;
}

function engineBody(d: PreviewContextData): string {
  const rpmVal = parseInt(d.engine.rpm, 10) || 85;
  const loadVal = parseInt(d.engine.load, 10) || 72;
  const healthOk = /normal|good/i.test(d.engine.health);
  const rpmDash = Math.min(75, Math.round((rpmVal / 100) * 75));
  const loadDash = Math.min(75, Math.round((loadVal / 100) * 75));
  const healthTextClass = healthOk ? 'text-emerald-400' : 'text-amber-400';
  const healthDotClass = healthOk ? 'bg-emerald-400' : 'bg-amber-400';
  const healthBarClass = healthOk
    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
    : 'bg-gradient-to-r from-amber-500 to-orange-400';
  const healthWidth = healthOk ? 88 : 62;
  return `        <div className="space-y-4">
          <p className="text-xs text-slate-400">${esc(d.vesselName)} · machinery monitoring</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center rounded-xl border border-white/5 bg-slate-950/60 p-4">
              <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-500">RPM</p>
              <div className="relative h-20 w-28">
                <svg viewBox="0 0 80 44" className="h-full w-full">
                  <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" strokeDasharray="${rpmDash} 75" />
                </svg>
                <div className="absolute inset-x-0 bottom-0 text-center"><span className="text-lg font-bold text-slate-100">${rpmVal}</span></div>
              </div>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-white/5 bg-slate-950/60 p-4">
              <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-500">Load</p>
              <div className="relative h-20 w-28">
                <svg viewBox="0 0 80 44" className="h-full w-full">
                  <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="#34d399" strokeWidth="6" strokeLinecap="round" strokeDasharray="${loadDash} 75" />
                </svg>
                <div className="absolute inset-x-0 bottom-0 text-center"><span className="text-lg font-bold text-slate-100">${loadVal}<span className="ml-0.5 text-xs text-slate-400">%</span></span></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-400">Engine Health</span>
              <span className="flex items-center gap-2 text-sm font-semibold ${healthTextClass}">
                <span className="h-3 w-3 rounded-full ${healthDotClass} animate-pulse" />
                ${esc(d.engine.health)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full ${healthBarClass}" style={{ width: '${healthWidth}%' }} />
            </div>
          </div>
        </div>`;
}

function sensorBody(d: PreviewContextData): string {
  const values = d.speedSeries;
  const latest = values[values.length - 1];
  const prev = values[values.length - 2] ?? latest;
  const delta = latest - prev;
  const trend = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
  const trendClass =
    trend === 'up' ? 'bg-emerald-500/15 text-emerald-300' : trend === 'down' ? 'bg-rose-500/15 text-rose-300' : 'bg-slate-700/50 text-slate-300';
  const trendIcon = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
  const cols = values
    .slice(-4)
    .map(
      (v, i) => `            <div className="rounded-lg border border-white/5 bg-slate-950/50 px-2 py-2 text-center text-xs">
              <p className="text-slate-500">T−${3 - i}h</p>
              <p className="font-semibold text-slate-100">${v}</p>
            </div>`
    )
    .join('\n');
  return `        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <div>
              <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">Speed over ground</p>
              <p className="text-2xl font-bold text-cyan-300">${latest}<span className="ml-1 text-sm font-normal text-slate-400">kn</span></p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-xs font-medium ${trendClass}">${trendIcon} ${Math.abs(delta).toFixed(1)}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#061018] p-4">
            <p className="mb-2 text-[0.6rem] uppercase tracking-widest text-cyan-400/70">24h trend · ${esc(d.vesselName)}</p>
            <svg viewBox="0 0 240 64" className="h-24 w-full">
              <path d="M0,48 L40,42 L80,38 L120,35 L160,32 L200,28 L240,24 L240,64 L0,64 Z" fill="#22d3ee" fillOpacity="0.2" />
              <path d="M0,48 L40,42 L80,38 L120,35 L160,32 L200,28 L240,24" fill="none" stroke="#22d3ee" strokeWidth="2" />
            </svg>
          </div>
          <div className="grid grid-cols-4 gap-2">${cols}</div>
        </div>`;
}

function aisBody(d: PreviewContextData): string {
  const sog = `${12 + (d.progress % 8)} kn`;
  return `        <div className="space-y-3">
          <div className="rounded-xl border border-cyan-500/20 bg-[#061018] p-4">
            <p className="mb-3 text-[0.6rem] uppercase tracking-widest text-cyan-400/80">Live AIS feed</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">Vessel</p><p className="font-semibold text-slate-100">${esc(d.vesselName)}</p></div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">Position</p><p className="font-semibold text-slate-100">${esc(d.position)}</p></div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">SOG</p><p className="font-semibold text-slate-100">${sog}</p></div>
              <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"><p className="text-[0.6rem] uppercase text-slate-500">COG</p><p className="font-semibold text-slate-100">084°</p></div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />AIS position updated 12s ago
          </div>
        </div>`;
}

function gpsBody(d: PreviewContextData): string {
  const crumbs = ['1.2°N 103.4°E', '2.8°N 104.1°E', '3.3°N 104.8°E', `${d.position} 105.2°E`];
  const rows = crumbs
    .map(
      (b, i) => `          <li className="flex justify-between rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2 text-xs">
            <span className="text-slate-400">T−${crumbs.length - i}h</span>
            <span className="font-mono text-slate-200">${esc(b)}</span>
          </li>`
    )
    .join('\n');
  return `        <div className="space-y-3">
          <p className="text-xs text-slate-400">${esc(d.vesselName)} · track replay · ${esc(d.route)}</p>
          <div className="rounded-xl border border-amber-500/20 bg-[#0c1018] p-4">
            <svg viewBox="0 0 200 80" className="h-28 w-full">
              <path d="M 10 60 L 45 52 L 78 44 L 110 38 L 142 30 L 175 22" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
              <path d="M 10 60 L 45 52 L 78 44 L 110 38 L 142 30 L 175 22" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="175" cy="22" r="4" fill="#fbbf24" />
            </svg>
          </div>
          <ul className="space-y-1.5">${rows}</ul>
        </div>`;
}

function weatherBody(d: PreviewContextData): string {
  return `        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4">
            <p className="text-lg">💨</p><p className="text-xs text-slate-500">Wind</p><p className="mt-1 text-base font-semibold text-slate-100">${esc(d.weather.wind)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4">
            <p className="text-lg">🌊</p><p className="text-xs text-slate-500">Waves</p><p className="mt-1 text-base font-semibold text-slate-100">${esc(d.weather.waves)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4">
            <p className="text-lg">〰</p><p className="text-xs text-slate-500">Swell</p><p className="mt-1 text-base font-semibold text-slate-100">${esc(d.weather.swell)}</p>
          </div>
        </div>`;
}

function kpiBody(d: PreviewContextData): string {
  const cards = d.kpis
    .map(
      (k) => `            <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4 text-center">
              <p className="text-xs text-slate-500">${esc(k.label)}</p>
              <p className="mt-1 text-2xl font-bold text-sky-400">${esc(k.value)}</p>
            </div>`
    )
    .join('\n');
  return `        <div className="grid grid-cols-3 gap-3">${cards}</div>`;
}

function bodyForWidget(widgetName: string, d: PreviewContextData): string {
  const id = previewIdentity(widgetName);
  switch (id) {
    case 'VoyageProgressTracker':
      return voyageBody(d);
    case 'FuelGaugeCards':
      return fuelBody(d);
    case 'AlertPanel':
      return alertBody(d);
    case 'CrewCertificationStatus':
      return crewBody(d);
    case 'EngineMonitor':
      return engineBody(d);
    case 'SensorStreamPanel':
      return sensorBody(d);
    case 'AISLiveFeed':
      return aisBody(d);
    case 'GPSTracker':
      return gpsBody(d);
    case 'WeatherWidget':
      return weatherBody(d);
    case 'KPIDashboard':
      return kpiBody(d);
    default:
      return `        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">${esc(d.domain)}</div>`;
  }
}

export function buildCuratedComponent(widgetName: string, data: PreviewContextData): string {
  const canonical = normalizeWidgetName(widgetName);
  const { title, subtitle } = widgetMeta(canonical, data);
  return shell(canonical, title, subtitle, bodyForWidget(canonical, data));
}

const STACKBLITZ_SCAFFOLD = {
  indexHtml: `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BridgeView AI Preview</title>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  packageJson: `{
  "name": "bridgeview-ai-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}`,

  viteConfig: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

  tailwindConfig: `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`,

  postcssConfig: `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}`,

  indexCss: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,

  mainTsx: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
};

/** Build StackBlitz project from the same curated preview data as Live Preview. */
export function buildCuratedStackBlitzProject(data: PreviewContextData, activeWidgets: string[]): Project {
  const widgets = dedupePreviewWidgets(activeWidgets);
  const files: Record<string, string> = {
    'index.html': STACKBLITZ_SCAFFOLD.indexHtml,
    'package.json': STACKBLITZ_SCAFFOLD.packageJson,
    'vite.config.ts': STACKBLITZ_SCAFFOLD.viteConfig,
    'tailwind.config.js': STACKBLITZ_SCAFFOLD.tailwindConfig,
    'postcss.config.js': STACKBLITZ_SCAFFOLD.postcssConfig,
    'src/index.css': STACKBLITZ_SCAFFOLD.indexCss,
    'src/main.tsx': STACKBLITZ_SCAFFOLD.mainTsx,
  };

  const imports: string[] = [];
  const renders: string[] = [];

  for (const w of widgets) {
    const canonical = normalizeWidgetName(w);
    files[`src/components/${canonical}.tsx`] = buildCuratedComponent(canonical, data);
    imports.push(`import ${canonical} from './components/${canonical}';`);
    renders.push(`        <div className="w-full"><${canonical} /></div>`);
  }

  files['src/App.tsx'] = `import React from 'react';
${imports.join('\n')}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-7xl flex flex-col gap-8">
        <header className="border-b border-white/10 pb-4">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">BridgeView AI</p>
          <h1 className="text-3xl font-bold text-sky-400">${esc(data.vesselName)}</h1>
          <p className="mt-1 text-sm text-slate-400">${esc(data.route)} · ${esc(data.legLabel)} · ${esc(data.domain)}</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
${renders.join('\n')}
        </div>
      </div>
    </div>
  );
}
`;

  return {
    title: `BridgeView — ${data.vesselName}`,
    description: 'Curated dashboard preview matching live preview',
    template: 'node',
    files,
  };
}
