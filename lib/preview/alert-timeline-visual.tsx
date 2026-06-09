'use client';

import type { PreviewAlert } from './parse-prd';

const STYLES = {
  critical: { bar: 'bg-rose-500', card: 'border-rose-500/40 bg-rose-500/10', text: 'text-rose-200', icon: '!' },
  warning: { bar: 'bg-amber-500', card: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-200', icon: '⚠' },
  info: { bar: 'bg-sky-500', card: 'border-sky-500/40 bg-sky-500/10', text: 'text-sky-200', icon: 'i' },
};

export function AlertTimelineVisual({ alerts, priority }: { alerts: PreviewAlert[]; priority: string }) {
  const counts = {
    critical: alerts.filter((a) => a.level === 'critical').length,
    warning: alerts.filter((a) => a.level === 'warning').length,
    info: alerts.filter((a) => a.level === 'info').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['critical', 'warning', 'info'] as const).map((lvl) => (
          <div key={lvl} className={`flex-1 rounded-lg border px-3 py-2 text-center ${STYLES[lvl].card}`}>
            <p className="text-lg font-bold">{counts[lvl]}</p>
            <p className="text-[0.6rem] uppercase tracking-wide opacity-80">{lvl}</p>
          </div>
        ))}
      </div>
      <div className="relative pl-4">
        <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-slate-700" />
        <ul className="space-y-3">
          {alerts.map((a, i) => {
            const s = STYLES[a.level];
            return (
              <li key={i} className="relative flex gap-3">
                <span className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-bold text-white ${s.bar}`}>
                  {s.icon}
                </span>
                <div className={`flex-1 rounded-lg border px-3 py-2.5 ${s.card}`}>
                  <div className="flex justify-between text-[0.6rem] font-medium uppercase tracking-wide opacity-70">
                    <span>{a.level}</span>
                    <span>{a.time}</span>
                  </div>
                  <p className={`mt-1 text-sm leading-snug ${s.text}`}>{a.msg}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-center text-[0.65rem] text-slate-500">Priority context: {priority}</p>
    </div>
  );
}
