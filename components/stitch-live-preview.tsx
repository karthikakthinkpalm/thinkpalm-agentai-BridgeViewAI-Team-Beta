'use client';

import { useMemo } from 'react';

export type StitchPreviewState = {
  html: string;
  imageUrl: string;
  screenId: string;
  projectId: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};

export function StitchLivePreview({
  preview,
  prdLength,
}: {
  preview: StitchPreviewState;
  prdLength: number;
}) {
  const srcDoc = useMemo(() => {
    if (!preview.html) return '';
    if (preview.html.includes('<html')) return preview.html;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{margin:0;background:#0f172a;}</style></head><body>${preview.html}</body></html>`;
  }, [preview.html]);

  return (
    <section className="glass-panel animate-panel-rise flex h-full min-h-[32rem] flex-col overflow-hidden delay-300 xl:min-h-0">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">Live Preview</p>
            <p className="mt-1 text-xs text-slate-500">
              Google Stitch · PRD ({prdLength} chars)
              {preview.status === 'ready' && ' · non-actionable links removed'}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[0.65rem] font-mono ${
              preview.status === 'loading'
                ? 'bg-amber-400/10 text-amber-200'
                : preview.status === 'ready'
                  ? 'bg-emerald-400/10 text-emerald-200'
                  : preview.status === 'error'
                    ? 'bg-rose-400/10 text-rose-200'
                    : 'bg-slate-800/80 text-slate-400'
            }`}
          >
            {preview.status === 'loading'
              ? 'Generating…'
              : preview.status === 'ready'
                ? 'Ready'
                : preview.status === 'error'
                  ? 'Error'
                  : 'Waiting'}
          </span>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-slate-950/60">
        {preview.status === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-8 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
            <p className="font-mono text-sm text-slate-300">Stitch is generating your dashboard…</p>
            <p className="max-w-xs text-xs text-slate-500">Usually takes 1–3 minutes.</p>
          </div>
        )}

        {preview.status === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="font-mono text-sm text-rose-300">Stitch preview failed</p>
            <p className="max-w-sm text-xs text-slate-500">{preview.error}</p>
          </div>
        )}

        {preview.status === 'idle' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/20 text-xl">
              ⚡
            </div>
            <p className="font-mono text-sm text-slate-400">
              Click &quot;Generate UI&quot; to create a Stitch live preview.
            </p>
          </div>
        )}

        {preview.status === 'ready' && srcDoc && (
          <iframe
            title="Stitch live preview"
            srcDoc={srcDoc}
            className="h-full w-full border-0 bg-slate-950"
            sandbox="allow-scripts allow-same-origin"
          />
        )}

        {preview.status === 'ready' && !srcDoc && preview.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.imageUrl}
            alt="Stitch dashboard preview"
            className="h-full w-full object-contain"
          />
        )}
      </div>
    </section>
  );
}
