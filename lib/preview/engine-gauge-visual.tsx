'use client';

function ArcGauge({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const dash = (pct / 100) * 75;
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/5 bg-slate-950/60 p-4">
      <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-slate-500">{label}</p>
      <div className="relative h-20 w-28">
        <svg viewBox="0 0 80 44" className="h-full w-full">
          <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
          <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${dash} 75`} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className="text-lg font-bold text-slate-100">{value}</span>
          <span className="ml-0.5 text-xs text-slate-400">{unit}</span>
        </div>
      </div>
    </div>
  );
}

export function EngineGaugeVisual({
  rpm,
  load,
  health,
  vesselName,
}: {
  rpm: string;
  load: string;
  health: string;
  vesselName: string;
}) {
  const rpmVal = parseInt(rpm, 10) || 85;
  const loadVal = parseInt(load, 10) || 72;
  const healthOk = health.toLowerCase() === 'normal' || health.toLowerCase() === 'good';

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{vesselName} · machinery monitoring</p>
      <div className="grid grid-cols-2 gap-3">
        <ArcGauge label="RPM" value={rpmVal} max={100} unit="" color="#22d3ee" />
        <ArcGauge label="Load" value={loadVal} max={100} unit="%" color="#34d399" />
      </div>
      <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-400">Engine Health</span>
          <span className={`flex items-center gap-2 text-sm font-semibold ${healthOk ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`h-3 w-3 rounded-full ${healthOk ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            {health}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full ${healthOk ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
            style={{ width: healthOk ? '88%' : '62%' }}
          />
        </div>
      </div>
    </div>
  );
}
