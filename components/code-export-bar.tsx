'use client';

import { useState } from 'react';
import {
  copyToClipboard,
  downloadAllComponents,
  downloadComponent,
  downloadWithIndex,
  productionizeComponent,
} from '@/lib/export/code-export';
import { openStackBlitz } from '@/lib/preview/stackblitz-builder';

export function CodeExportBar({
  selectedWidget,
  code,
  allComponents,
}: {
  selectedWidget: string;
  code: string;
  allComponents: Record<string, string>;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const count = Object.keys(allComponents).length;

  async function handleCopy() {
    if (!code) return;
    const ok = await copyToClipboard(productionizeComponent(code, selectedWidget));
    setCopyStatus(ok ? 'ok' : 'fail');
    setTimeout(() => setCopyStatus('idle'), 2000);
  }

  if (!selectedWidget || !code) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-xl border border-slate-600/80 bg-slate-900/80 px-3 py-1.5 font-mono text-[0.65rem] text-slate-300 transition hover:border-teal-400/50 hover:text-teal-200"
      >
        {copyStatus === 'ok' ? '✓ Copied' : copyStatus === 'fail' ? 'Copy failed' : '⎘ Copy code'}
      </button>
      <button
        type="button"
        onClick={() => downloadComponent(selectedWidget, code)}
        className="rounded-xl border border-teal-400/30 bg-teal-400/10 px-3 py-1.5 font-mono text-[0.65rem] text-teal-200 transition hover:bg-teal-400/20"
      >
        ↓ {selectedWidget}.tsx
      </button>
      {count > 0 && (
        <>
          <button
            type="button"
            onClick={() => downloadAllComponents(allComponents)}
            className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 font-mono text-[0.65rem] text-blue-200 transition hover:bg-blue-400/20"
          >
            ↓ Export all ({count})
          </button>
          <button
            type="button"
            onClick={() => downloadWithIndex(allComponents)}
            className="rounded-xl border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 font-mono text-[0.65rem] text-purple-200 transition hover:bg-purple-400/20"
          >
            ↓ Bundle + index
          </button>
          <button
            type="button"
            onClick={() => openStackBlitz(allComponents, Object.keys(allComponents))}
            className="rounded-xl border border-orange-400/30 bg-orange-400/10 px-3 py-1.5 font-mono text-[0.65rem] text-orange-200 transition hover:bg-orange-400/20"
          >
            ↗ Open in StackBlitz
          </button>
        </>
      )}
    </div>
  );
}
