'use client';

import type { VisualizationRecommendation } from '@/lib/types/visualization';

const PRIORITY_STYLES: Record<string, string> = {
  'safety-critical': 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  operational: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  informational: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
};

export function VizRecommendationsPanel({
  recommendations,
}: {
  recommendations: VisualizationRecommendation[];
}) {
  if (recommendations.length === 0) {
    return (
      <p className="text-xs font-mono text-slate-500">
        Edit your PRD or run the pipeline — visualization rules will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {recommendations.map((rec) => (
        <div
          key={rec.dataField}
          className="rounded-xl border border-white/5 bg-slate-950/50 p-3 text-xs"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-teal-300">{rec.dataField}</span>
            {rec.confidence !== undefined && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-mono font-medium text-emerald-300">
                {Math.round(rec.confidence * 100)}% conf
              </span>
            )}
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide ${
                PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.operational
              }`}
            >
              {rec.priority}
            </span>
          </div>
          {rec.classification && (
            <p className="mb-1 font-mono text-[0.6rem] text-slate-500">
              {rec.classification.dataType}
              {rec.classification.dimensions.temporal ? ' · temporal' : ''}
              {rec.classification.dimensions.spatial ? ' · spatial' : ''}
              {rec.classification.dimensions.numerical ? ' · numerical' : ''}
              {rec.classification.dimensions.categorical ? ' · categorical' : ''}
              {' · '}
              {rec.classification.monitoringObjective}
            </p>
          )}
          <p className="font-medium text-slate-200">{rec.visualization}</p>
          <p className="mt-1 text-slate-400">
            <span className="text-slate-500">Widget:</span> {rec.widget}
            <span className="mx-1 text-slate-600">·</span>
            <span className="text-slate-500">Archetype:</span> {rec.archetype}
            {rec.semanticDomain && (
              <>
                <span className="mx-1 text-slate-600">·</span>
                <span className="text-slate-500">Domain:</span>{' '}
                <span className="text-violet-300">{rec.semanticDomain}</span>
              </>
            )}
            {rec.visualPattern && (
              <>
                <span className="mx-1 text-slate-600">·</span>
                <span className="font-mono text-slate-500">{rec.visualPattern}</span>
              </>
            )}
          </p>
          <p className="mt-2 leading-relaxed text-slate-400">{rec.reason}</p>
          <p className="mt-1 font-mono text-[0.65rem] text-slate-500">
            Interaction: {rec.interaction}
          </p>
        </div>
      ))}
    </div>
  );
}
