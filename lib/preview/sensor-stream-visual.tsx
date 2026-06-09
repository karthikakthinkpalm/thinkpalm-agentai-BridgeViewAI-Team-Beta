'use client';

function sparkline(seed: string, w: number, h: number, points: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  const pts: string[] = [];
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * w;
    const y = h - ((Math.abs((hash + i * 13) % 100) / 100) * (h - 6) + 3);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

export function SensorStreamVisual({
  vesselName,
  metric,
  unit,
  values,
}: {
  vesselName: string;
  metric: string;
  unit: string;
  values: number[];
}) {
  const latest = values[values.length - 1];
  const prev = values[values.length - 2] ?? latest;
  const delta = latest - prev;
  const trend = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/60 p-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">{metric}</p>
          <p className="text-2xl font-bold text-cyan-300">
            {latest}
            <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            trend === 'up'
              ? 'bg-emerald-500/15 text-emerald-300'
              : trend === 'down'
                ? 'bg-rose-500/15 text-rose-300'
                : 'bg-slate-700/50 text-slate-300'
          }`}
        >
          {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'} {Math.abs(delta).toFixed(1)}
        </span>
      </div>
      <div className="rounded-xl border border-white/5 bg-[#061018] p-4">
        <p className="mb-2 text-[0.6rem] uppercase tracking-widest text-cyan-400/70">
          24h trend · {vesselName}
        </p>
        <svg viewBox="0 0 240 64" className="h-24 w-full">
          <defs>
            <linearGradient id="streamFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${sparkline(metric + vesselName, 240, 64, 12)} L 240 64 L 0 64 Z`}
            fill="url(#streamFill)"
          />
          <path
            d={sparkline(metric + vesselName, 240, 64, 12)}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
          />
        </svg>
        <div className="mt-2 flex justify-between text-[0.6rem] text-slate-500">
          <span>−12h</span>
          <span>Now</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {values.slice(-4).map((v, i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-slate-950/50 px-2 py-2">
            <p className="text-slate-500">T−{3 - i}h</p>
            <p className="font-semibold text-slate-100">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
