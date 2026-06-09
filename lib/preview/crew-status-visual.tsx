'use client';

import type { PreviewCrewMember } from './parse-prd';

function statusColor(s: PreviewCrewMember['status']) {
  return s === 'valid'
    ? { dot: 'bg-emerald-400', ring: 'stroke-emerald-500/50', badge: 'bg-emerald-500/15 text-emerald-300', label: 'Valid' }
    : { dot: 'bg-amber-400', ring: 'stroke-amber-500/50', badge: 'bg-amber-500/15 text-amber-300', label: 'Expiring' };
}

export function CrewStatusVisual({ crew, vesselName }: { crew: PreviewCrewMember[]; vesselName: string }) {
  const valid = crew.filter((c) => c.status === 'valid').length;
  const pct = Math.round((valid / crew.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-950/60 p-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3"
              strokeDasharray={`${(pct / 100) * 94} 94`} strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold text-emerald-300">{pct}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">STCW Compliance</p>
          <p className="text-xs text-slate-400">{vesselName} · {valid}/{crew.length} valid certificates</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {crew.map((c) => {
          const sc = statusColor(c.status);
          return (
            <div key={c.name} className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800">
                <svg viewBox="0 0 24 24" className="absolute inset-1">
                  <circle cx="12" cy="12" r="10" fill="none" className={sc.ring} strokeWidth="2" />
                </svg>
                <span className={`h-2.5 w-2.5 rounded-full ${sc.dot}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{c.name}</p>
                <p className="text-xs text-slate-400">{c.role}</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${sc.badge}`}>{sc.label}</span>
                <p className="mt-0.5 text-[0.6rem] text-slate-500">{c.exp}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
