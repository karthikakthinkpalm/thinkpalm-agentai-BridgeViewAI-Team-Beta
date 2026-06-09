function shell(widgetName: string, title: string, subtitle: string, body: string): string {
  return `import React from 'react';

export default function ${widgetName}() {
  return (
    <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5 shadow-lg shadow-black/30">
      <div className="mb-4 border-b border-white/5 pb-3">
        <h3 className="text-base font-semibold text-[rgb(var(--accent)/0.95)]">${title}</h3>
        <p className="mt-0.5 text-sm text-slate-400">${subtitle}</p>
      </div>
      <div className="flex-1">
${body}
      </div>
    </div>
  );
}`;
}

function routeMapBody(): string {
  return `        <div className="grid gap-4 lg:grid-cols-5">
          <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-[#061018] lg:col-span-3">
            <p className="border-b border-white/5 px-3 py-2 text-[0.6rem] uppercase tracking-widest text-cyan-400/80">ECDIS Route Map</p>
            <svg viewBox="0 0 100 72" className="h-56 w-full" aria-label="Voyage route map">
              <defs>
                <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0a1628" />
                  <stop offset="100%" stopColor="#0c2340" />
                </linearGradient>
              </defs>
              <rect width="100" height="72" fill="url(#ocean)" />
              <path d="M 14 38 C 30 20, 55 55, 78 72" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" />
              <path d="M 14 38 C 30 20, 55 55, 78 72" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
              <circle cx="14" cy="38" r="2.5" fill="#34d399" />
              <circle cx="78" cy="72" r="2.5" fill="#f87171" />
              <polygon points="48,42 46,46 50,46" fill="#fbbf24" />
            </svg>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/60 p-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="60 94" strokeLinecap="round" />
                </svg>
                <span className="text-xs font-bold text-cyan-300">64%</span>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2 text-xs">
                <div><p className="text-slate-500">ETA</p><p className="font-semibold text-slate-100">26 Jun</p></div>
                <div><p className="text-slate-500">Remaining</p><p className="font-semibold text-slate-100">2,397 nm</p></div>
                <div><p className="text-slate-500">Position</p><p className="font-semibold text-slate-100">3.3°N</p></div>
                <div><p className="text-slate-500">SOG</p><p className="font-semibold text-slate-100">12 kn</p></div>
              </div>
            </div>
          </div>
        </div>`;
}

function gaugeBody(): string {
  const tanks = [
    { name: 'HFO', pct: 87, burn: '1.9 t/d', days: 366 },
    { name: 'MDO', pct: 63, burn: '0.6 t/d', days: 210 },
    { name: 'LO', pct: 86, burn: '0.2 t/d', days: 420 },
  ];
  const cards = tanks
    .map(
      (t) => `            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
              <div className="mb-3 flex justify-between">
                <p className="text-sm font-semibold text-slate-100">${t.name} Tank</p>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[0.65rem] text-emerald-300">${t.days}d left</span>
              </div>
              <div className="flex gap-4">
                <div className="relative flex h-32 w-14 flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                  <div className="w-full rounded-b-md bg-gradient-to-t from-emerald-500 to-teal-400" style={{ height: '${t.pct}%' }} />
                  <span className="absolute inset-x-0 bottom-1 text-center text-[0.6rem] font-bold text-white">${t.pct}%</span>
                </div>
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Burn</span><span className="font-semibold text-slate-100">${t.burn}</span></div>
                  <div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: '${t.pct}%' }} /></div>
                </div>
              </div>
            </div>`
    )
    .join('\n');
  return `        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">\n${cards}\n        </div>`;
}

function alertBody(): string {
  return `        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center"><p className="text-lg font-bold text-rose-200">1</p><p className="text-[0.6rem] uppercase text-rose-300/80">Critical</p></div>
            <div className="flex-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center"><p className="text-lg font-bold text-amber-200">2</p><p className="text-[0.6rem] uppercase text-amber-300/80">Warning</p></div>
            <div className="flex-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-center"><p className="text-lg font-bold text-sky-200">1</p><p className="text-[0.6rem] uppercase text-sky-300/80">Info</p></div>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start gap-3 rounded-lg border border-rose-500/50 bg-rose-500/10 p-3"><span className="font-bold text-rose-300">!</span><div><p className="text-sm font-semibold text-rose-100">Safety system fault</p><p className="text-xs text-rose-200/70">Fire detection zone 3</p></div></li>
            <li className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3"><span className="text-amber-300">⚠</span><div><p className="text-sm font-semibold text-amber-100">Machinery parameter limit</p><p className="text-xs text-amber-200/70">ME exhaust temp trending high</p></div></li>
          </ul>
        </div>`;
}

function listBody(): string {
  return `        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="75 94" strokeLinecap="round" />
              </svg>
              <span className="text-xs font-bold text-emerald-300">80%</span>
            </div>
            <div><p className="text-sm font-semibold text-slate-100">STCW Compliance</p><p className="text-xs text-slate-400">4/5 valid certificates</p></div>
          </div>
          <ul className="space-y-2">
            {[
              { name: 'Capt. Hansen', rank: 'Master', status: 'valid', year: '2027' },
              { name: 'G. Martinez', rank: 'Chief Eng.', status: 'valid', year: '2026' },
              { name: 'J. Clarkson', rank: '2nd Off.', status: 'expiring', year: '2025' },
            ].map((c) => (
              <li key={c.name} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/50 px-4 py-3">
                <div><p className="text-sm font-medium text-slate-100">{c.name}</p><p className="text-xs text-slate-400">{c.rank}</p></div>
                <span className={\`rounded-full px-2.5 py-1 text-xs font-medium \${c.status === 'valid' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}\`}>{c.year}</span>
              </li>
            ))}
          </ul>
        </div>`;
}

function kpiBody(): string {
  return `        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'CII Rating', value: 'B' },
            { label: 'EEOI', value: '12.4' },
            { label: 'On-time %', value: '94%' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4 text-center">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="mt-1 text-2xl font-bold text-[rgb(var(--accent)/0.95)]">{k.value}</p>
            </div>
          ))}
        </div>`;
}

function engineBody(): string {
  return `        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-500">RPM</p>
            <p className="text-2xl font-bold text-cyan-300">82</p>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-500">Load</p>
            <p className="text-2xl font-bold text-amber-300">74%</p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">Engine health</span><span className="font-semibold text-emerald-300">Good</span></div>
            <div className="h-2 rounded-full bg-slate-800"><div className="h-full w-[88%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" /></div>
          </div>
        </div>`;
}

function sensorStreamBody(): string {
  return `        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <div><p className="text-xs text-slate-500">Speed over ground</p><p className="text-2xl font-bold text-cyan-300">12.4 <span className="text-sm text-slate-400">kn</span></p></div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">▲ 0.8</span>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-[#061018] p-4">
            <p className="mb-2 text-[0.6rem] uppercase text-cyan-400/70">24h SOG trend</p>
            <svg viewBox="0 0 240 64" className="h-24 w-full"><path d="M0,48 L40,42 L80,38 L120,35 L160,32 L200,28 L240,24" fill="none" stroke="#22d3ee" strokeWidth="2" /></svg>
          </div>
        </div>`;
}

function genericBody(description: string): string {
  return `        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
          ${description.replace(/"/g, '\\"')}
        </div>`;
}

const WIDGET_TITLES: Record<string, { title: string; subtitle: string }> = {
  VoyageProgressTracker: { title: 'Voyage Progress', subtitle: 'MV Atlantic Star · Leg 1 of 3' },
  FuelGaugeCards: { title: 'Fuel Gauges', subtitle: 'MV Atlantic Star · HFO / MDO / LO' },
  CrewCertificationStatus: { title: 'Crew Certification', subtitle: 'STCW compliance roster' },
  AlertPanel: { title: 'Alert Panel', subtitle: 'Active operational alerts' },
  EngineMonitor: { title: 'Engine Monitor', subtitle: 'Main engine parameters' },
  KPIDashboard: { title: 'KPI Dashboard', subtitle: 'Operational performance' },
  WeatherWidget: { title: 'Weather', subtitle: 'Route conditions' },
};

function bodyForArchetype(archetype: string, widgetName: string, description: string): string {
  const n = widgetName.toLowerCase();
  if (/sensor|stream|sog|speed/.test(n)) return sensorStreamBody();
  if (/engine|rpm|machinery/.test(n)) return engineBody();
  if (/voyageprogress|voyagetracker/.test(n) || (archetype === 'route-map' && /voyage|route|progress/.test(n))) {
    return routeMapBody();
  }
  if (/fuel|hfo|mdo|bunker|tank/.test(n) || (archetype === 'gauge' && /fuel|tank/.test(n))) {
    return gaugeBody();
  }
  if (archetype === 'alert' || /alert|alarm/.test(n)) return alertBody();
  if (archetype === 'list' || /crew|cert/.test(n)) return listBody();
  if (archetype === 'table' || archetype === 'kpi' || /kpi/.test(n)) return kpiBody();
  if (/weather/.test(n)) {
    return `        <div className="grid grid-cols-3 gap-3 text-center">
          {[{ label: 'Wind', value: '18 kn' }, { label: 'Waves', value: '2.1 m' }, { label: 'Swell', value: '1.4 m' }].map((w) => (
            <div key={w.label} className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-4">
              <p className="text-xs text-slate-500">{w.label}</p>
              <p className="mt-1 text-base font-semibold text-slate-100">{w.value}</p>
            </div>
          ))}
        </div>`;
  }
  return genericBody(description);
}

export function buildFallbackComponent(
  widgetName: string,
  description: string,
  archetype: string,
  domain: string
): string {
  const meta = WIDGET_TITLES[widgetName] ?? {
    title: widgetName.replace(/([A-Z])/g, ' $1').trim(),
    subtitle: domain,
  };
  const body = bodyForArchetype(archetype, widgetName, description);
  return shell(widgetName, meta.title, meta.subtitle, body);
}
