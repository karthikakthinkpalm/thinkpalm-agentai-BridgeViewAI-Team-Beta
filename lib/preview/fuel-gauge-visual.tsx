'use client';

import type { PreviewTank } from './parse-prd';

function fillColor(pct: number) {
  if (pct >= 60) return 'from-emerald-500 to-teal-400';
  if (pct >= 30) return 'from-amber-500 to-orange-400';
  return 'from-rose-500 to-red-400';
}

function sparkline(seed: string, w: number, h: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const x = (i / 7) * w;
    const y = h - ((Math.abs((hash + i * 17) % 100) / 100) * (h - 4) + 2);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function TankCard({ tank, i }: { tank: PreviewTank; i: number }) {
  const grad = fillColor(tank.pct);
  const tc = tank.pct >= 60 ? 'text-emerald-400' : tank.pct >= 30 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
      <div className="mb-3 flex justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-100">{tank.name} Tank</p>
          <p className="text-xs text-slate-500">{tank.capacity}</p>
        </div>
        <span className={`rounded-full bg-slate-800 px-2 py-0.5 text-[0.65rem] font-medium ${tc}`}>
          {tank.daysRemaining}d left
        </span>
      </div>
      <div className="flex gap-4">
        <div className="relative flex h-32 w-14 shrink-0 flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-slate-900">
          <div className={`w-full rounded-b-md bg-gradient-to-t ${grad}`} style={{ height: `${tank.pct}%` }} />
          <span className="absolute inset-x-0 bottom-1 text-center text-[0.6rem] font-bold text-white">{tank.pct}%</span>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-400">Fill</span>
              <span className={`font-semibold ${tc}`}>{tank.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${tank.pct}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-400">Burn rate</span>
              <span className="text-slate-200">{tank.rate}</span>
            </div>
            <svg viewBox="0 0 88 24" className="h-6 w-full">
              <path d={sparkline(tank.name + i, 88, 24)} fill="none" stroke="currentColor" strokeWidth="1.5" className={tc} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FuelGaugeVisual({ tanks, vesselName }: { tanks: PreviewTank[]; vesselName: string }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {tanks.map((t, i) => (
          <TankCard key={t.name} tank={t} i={i} />
        ))}
      </div>
      <div className="rounded-xl border border-white/5 bg-slate-900/50 p-3">
        <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-500">Fleet overview · {vesselName}</p>
        <div className="flex h-20 items-end gap-2">
          {tanks.map((t) => (
            <div key={t.name} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end rounded-t bg-slate-800/80">
                <div className={`w-full bg-gradient-to-t ${fillColor(t.pct)}`} style={{ height: `${t.pct}%` }} />
              </div>
              <span className="text-[0.6rem] text-slate-400">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
