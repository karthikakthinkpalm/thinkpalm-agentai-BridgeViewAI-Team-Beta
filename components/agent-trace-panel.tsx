import React from 'react';
import type { PipelineResult } from '@/lib/types/pipeline';

interface AgentTracePanelProps {
  trace: NonNullable<PipelineResult['debugTrace']>;
}

export function AgentTracePanel({ trace }: AgentTracePanelProps) {
  if (!trace) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/60 shadow-xl backdrop-blur-md">
      <div className="flex items-center border-b border-slate-700/50 bg-slate-800/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">Agent Trace Diagnostics</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
        {/* Agent 1 */}
        <section>
          <h4 className="mb-2 font-medium text-sky-400">Agent 1: Requirement Analysis</h4>
          <div className="space-y-2 rounded-lg bg-slate-950/50 p-3 border border-slate-800">
            <div>
              <span className="text-slate-400">Detected Priority: </span>
              <span className="font-medium text-slate-200">{trace.detectedPriority || 'None'}</span>
            </div>
            <div>
              <span className="text-slate-400">Extracted Metrics: </span>
              {trace.extractedMetrics && trace.extractedMetrics.length > 0 ? (
                <ul className="mt-1 list-inside list-disc text-slate-300">
                  {trace.extractedMetrics.map((m, i) => (
                    <li key={i}>{m.name}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500">None</span>
              )}
            </div>
          </div>
        </section>

        {/* Agent 3 */}
        <section>
          <h4 className="mb-2 font-medium text-indigo-400">Agent 3: Selected Widgets</h4>
          <div className="rounded-lg bg-slate-950/50 p-3 border border-slate-800">
            {trace.selectedWidgetNames && trace.selectedWidgetNames.length > 0 ? (
              <ul className="list-inside list-disc text-slate-300">
                {trace.selectedWidgetNames.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              <span className="text-slate-500">None selected</span>
            )}
          </div>
        </section>

        {/* Agent 5 */}
        <section>
          <h4 className="mb-2 font-medium text-emerald-400">Agent 5: React Generation</h4>
          <div className="space-y-3">
            <div className={`rounded-lg p-3 border ${trace.generationWarnings && trace.generationWarnings.length > 0 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
              <h5 className="mb-1 text-slate-400">Warnings</h5>
              {trace.generationWarnings && trace.generationWarnings.length > 0 ? (
                <ul className="list-inside list-disc text-amber-300/90">
                  {trace.generationWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500">No warnings</span>
              )}
            </div>

            <div className={`rounded-lg p-3 border ${trace.fallbackWidgetsUsed && trace.fallbackWidgetsUsed.length > 0 ? 'bg-rose-950/30 border-rose-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
              <h5 className="mb-1 text-slate-400">Fallback Widgets Used</h5>
              {trace.fallbackWidgetsUsed && trace.fallbackWidgetsUsed.length > 0 ? (
                <ul className="list-inside list-disc text-rose-300/90">
                  {trace.fallbackWidgetsUsed.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500">No fallbacks used</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
