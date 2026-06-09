'use client';

import type { PreviewContextData } from './parse-prd';

const PORTS: Record<string, { x: number; y: number }> = {
  Rotterdam: { x: 14, y: 38 }, Singapore: { x: 78, y: 72 }, Hamburg: { x: 16, y: 36 },
  Dubai: { x: 58, y: 58 }, Houston: { x: 8, y: 52 }, Suez: { x: 48, y: 52 },
};

function portPos(name: string) {
  const k = Object.keys(PORTS).find((p) => name.toLowerCase().includes(p.toLowerCase()));
  return k ? PORTS[k] : { x: 30 + (name.length % 40), y: 30 + (name.length % 35) };
}

function parseRoute(route: string) {
  const p = route.split(/\s*(?:→|->| to )\s*/i).map((s) => s.trim()).filter(Boolean);
  return p.length >= 2 ? { o: p[0], d: p[p.length - 1] } : { o: 'Origin', d: 'Dest' };
}

function onCurve(t: number, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) {
  const u = 1 - t;
  return {
    x: u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y,
  };
}

export function VoyageRouteVisual({ data }: { data: PreviewContextData }) {
  const { o, d } = parseRoute(data.route);
  const start = portPos(o);
  const end = portPos(d);
  const c1 = { x: start.x + (end.x - start.x) * 0.3, y: start.y - 12 };
  const c2 = { x: start.x + (end.x - start.x) * 0.7, y: end.y + 10 };
  const vessel = onCurve(data.progress / 100, start, c1, c2, end);
  const path = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
  const sog = 12 + (data.progress % 8);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-[#061018] lg:col-span-3">
        <div className="border-b border-white/5 px-3 py-2">
          <p className="text-[0.6rem] uppercase tracking-widest text-cyan-400/80">ECDIS Route Map</p>
          <p className="text-xs font-semibold text-slate-200">{data.vesselName} · {data.legLabel}</p>
        </div>
        <svg viewBox="0 0 100 72" className="h-56 w-full">
          <defs>
            <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0a1628" /><stop offset="100%" stopColor="#0c2340" />
            </linearGradient>
          </defs>
          <rect width="100" height="72" fill="url(#ocean)" />
          <path d="M 2 8 L 28 6 L 32 22 L 24 42 L 8 48 L 2 32 Z" fill="#1e3a2f" opacity="0.7" />
          <path d="M 70 48 L 96 44 L 98 78 L 82 88 L 68 72 Z" fill="#1e3a2f" opacity="0.7" />
          <path d={path} fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="1.5 1" />
          <path d={path} fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray={`${data.progress} 100`} />
          <circle cx={start.x} cy={start.y} r="2.5" fill="#10b981" />
          <text x={start.x} y={start.y - 4} textAnchor="middle" fill="#94a3b8" fontSize="3">{o.slice(0, 10)}</text>
          <circle cx={end.x} cy={end.y} r="2.5" fill="#f59e0b" />
          <text x={end.x} y={end.y + 6} textAnchor="middle" fill="#94a3b8" fontSize="3">{d.slice(0, 10)}</text>
          <g transform={`translate(${vessel.x}, ${vessel.y})`}>
            <polygon points="0,-3.5 2.2,3 -2.2,3" fill="#e0f2fe" stroke="#22d3ee" strokeWidth="0.3" />
          </g>
        </svg>
      </div>
      <div className="space-y-3 lg:col-span-2">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/60 p-3">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#22d3ee" strokeWidth="3"
                strokeDasharray={`${(data.progress / 100) * 94} 94`} strokeLinecap="round" />
            </svg>
            <span className="text-xs font-bold text-white">{data.progress}%</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400">{data.route}</p>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${data.progress}%` }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { l: 'ETA', v: data.eta },
            { l: 'Remaining', v: data.remaining },
            { l: 'Position', v: data.position },
            { l: 'SOG', v: `${sog} kn` },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
              <p className="text-[0.6rem] uppercase text-slate-500">{s.l}</p>
              <p className="font-semibold text-slate-100">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
