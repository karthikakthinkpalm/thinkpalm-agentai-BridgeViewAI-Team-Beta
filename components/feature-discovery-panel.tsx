'use client';

import type { FeatureDiscoveryResult } from '@/lib/types/feature-discovery';

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  high: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  medium: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  low: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

const DOMAIN_COLORS: Record<string, string> = {
  covered: 'text-emerald-400',
  missing: 'text-rose-400',
};

function CoverageBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[0.6rem] font-mono text-slate-500">
        <span>{label}</span>
        <span className="text-slate-400">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function FeatureDiscoveryPanel({ discovery }: { discovery: FeatureDiscoveryResult | null }) {
  if (!discovery) {
    return (
      <p className="text-xs font-mono text-slate-500">
        BridgeView analyzes your PRD for missing maritime capabilities — run the pipeline or edit your spec.
      </p>
    );
  }

  const { dashboardHealth, requirements, domainCoverage, vesselTypeRecommendations, predictiveFeatures } =
    discovery;

  const allRecs = [
    ...dashboardHealth.recommendedFeatures,
    ...vesselTypeRecommendations,
    ...predictiveFeatures,
  ].filter((r, i, arr) => arr.findIndex((x) => x.feature === r.feature) === i);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-slate-500">Dashboard Health</span>
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 font-mono text-sm font-semibold text-teal-300">
            {dashboardHealth.coverageScore}%
          </span>
        </div>
        <div className="space-y-2">
          <CoverageBar label="Navigation" value={dashboardHealth.navigationCoverage} />
          <CoverageBar label="Operational" value={dashboardHealth.operationalCoverage} />
          <CoverageBar label="Safety" value={dashboardHealth.safetyCoverage} />
          <CoverageBar label="Compliance" value={dashboardHealth.complianceCoverage} />
          <CoverageBar label="Fleet" value={dashboardHealth.fleetCoverage} />
        </div>
        <p className="mt-3 font-mono text-[0.6rem] text-slate-500">
          Vessel: <span className="text-slate-300">{requirements.vesselType}</span>
          {discovery.autoExpandedWidgets.length > 0 && (
            <>
              {' · '}
              Auto-expanded:{' '}
              <span className="text-teal-300">{discovery.autoExpandedWidgets.join(', ')}</span>
            </>
          )}
        </p>
      </div>

      <div>
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-slate-500">Domain Coverage</p>
        <div className="flex flex-wrap gap-1.5">
          {domainCoverage.map((d) => (
            <span
              key={d.domain}
              className={`rounded-full border px-2 py-0.5 font-mono text-[0.6rem] ${
                d.covered
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              <span className={d.covered ? DOMAIN_COLORS.covered : DOMAIN_COLORS.missing}>
                {d.covered ? '✓' : '○'}
              </span>{' '}
              {d.domain}
            </span>
          ))}
        </div>
      </div>

      {allRecs.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-slate-500">
            Recommended Features ({allRecs.length})
          </p>
          <div className="space-y-2">
            {allRecs.map((rec) => (
              <div
                key={rec.feature}
                className="rounded-xl border border-white/5 bg-slate-950/50 p-3 text-xs"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">{rec.feature}</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-mono text-emerald-300">
                    {Math.round(rec.confidence * 100)}%
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase ${
                      PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.medium
                    }`}
                  >
                    {rec.priority}
                  </span>
                  <span className="font-mono text-[0.6rem] text-slate-500">{rec.domain}</span>
                </div>
                <p className="text-slate-400">{rec.businessValue}</p>
                <p className="mt-1 font-mono text-[0.65rem] text-slate-500">
                  Widget: {rec.widget} · {rec.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
