'use client';

export function GPSTrackVisual({
  vesselName,
  route,
  breadcrumbs,
}: {
  vesselName: string;
  route: string;
  breadcrumbs: string[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{vesselName} · track replay · {route}</p>
      <div className="rounded-xl border border-amber-500/20 bg-[#0c1018] p-4">
        <svg viewBox="0 0 200 80" className="h-28 w-full">
          <path
            d="M 10 60 L 45 52 L 78 44 L 110 38 L 142 30 L 175 22"
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <path
            d="M 10 60 L 45 52 L 78 44 L 110 38 L 142 30 L 175 22"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          {[
            [10, 60],
            [45, 52],
            [78, 44],
            [110, 38],
            [142, 30],
            [175, 22],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 5 ? 4 : 2.5} fill={i === 5 ? '#fbbf24' : '#64748b'} />
          ))}
        </svg>
      </div>
      <ul className="space-y-1.5 text-xs">
        {breadcrumbs.map((b, i) => (
          <li key={i} className="flex justify-between rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
            <span className="text-slate-400">T−{breadcrumbs.length - i}h</span>
            <span className="font-mono text-slate-200">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
