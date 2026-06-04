'use client';

import { useMemo, useState } from 'react';

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function DashboardStudio({
  widgets,
  hiddenWidgets,
  onChangeOrder,
  onToggleHidden,
  onShowAll,
}: {
  widgets: string[];
  hiddenWidgets: string[];
  onChangeOrder: (next: string[]) => void;
  onToggleHidden: (widget: string) => void;
  onShowAll: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const hiddenSet = useMemo(() => new Set(hiddenWidgets), [hiddenWidgets]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-200">Dashboard Studio</p>
          <p className="text-xs text-slate-500">
            Drag to reorder. Toggle visibility. Changes reflect in Live Preview immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={onShowAll}
          className="chip px-3 py-1.5 text-[0.65rem] font-medium text-slate-200 hover:border-[rgb(var(--accent)/0.35)]"
        >
          Show all
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[rgb(var(--surface-2)/0.35)] p-2">
        {widgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/70 bg-[rgb(var(--surface)/0.35)] p-6 text-center text-xs text-slate-500">
            Run the pipeline to populate widgets, then use Studio to reorder/hide them.
          </div>
        ) : (
          <ul className="space-y-2">
            {widgets.map((w, idx) => {
              const hidden = hiddenSet.has(w);
              return (
                <li
                  key={w}
                  draggable
                  onDragStart={() => setDragId(w)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === w) return;
                    const from = widgets.indexOf(dragId);
                    const to = idx;
                    if (from < 0) return;
                    onChangeOrder(moveItem(widgets, from, to));
                  }}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs transition ${
                    dragId === w
                      ? 'border-[rgb(var(--accent)/0.55)] bg-[rgb(var(--accent)/0.10)]'
                      : 'border-white/5 bg-[rgb(var(--surface)/0.45)]'
                  }`}
                >
                  <span className="select-none font-mono text-slate-500">⋮⋮</span>
                  <div className="flex-1">
                    <div className={`font-medium ${hidden ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {w}
                    </div>
                    <div className="text-[0.65rem] text-slate-500">Position {idx + 1}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleHidden(w)}
                    className={`rounded-lg border px-2.5 py-1 text-[0.65rem] font-medium transition ${
                      hidden
                        ? 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-[rgb(var(--accent)/0.4)]'
                        : 'border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.12)] text-white hover:bg-[rgb(var(--accent)/0.18)]'
                    }`}
                    aria-label={hidden ? `Show ${w}` : `Hide ${w}`}
                  >
                    {hidden ? 'Show' : 'Hide'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-[0.65rem] text-slate-500">
        <span className="chip px-2.5 py-1">Drag & drop</span>
        <span className="chip px-2.5 py-1">Visibility toggles</span>
        <span className="chip px-2.5 py-1">Live Preview sync</span>
      </div>
    </div>
  );
}

