'use client';

export function AISFeedVisual({
  vesselName,
  position,
  sog,
  cog,
}: {
  vesselName: string;
  position: string;
  sog: string;
  cog: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-500/20 bg-[#061018] p-4">
        <p className="mb-3 text-[0.6rem] uppercase tracking-widest text-cyan-400/80">Live AIS feed</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Vessel', value: vesselName },
            { label: 'Position', value: position },
            { label: 'SOG', value: sog },
            { label: 'COG', value: cog },
            { label: 'MMSI', value: '636019825' },
            { label: 'Status', value: 'Under way' },
          ].map((row) => (
            <div key={row.label} className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
              <p className="text-[0.6rem] uppercase text-slate-500">{row.label}</p>
              <p className="font-semibold text-slate-100">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        AIS position updated 12s ago
      </div>
    </div>
  );
}
