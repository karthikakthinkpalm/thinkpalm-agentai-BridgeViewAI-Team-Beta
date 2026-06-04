'use client';

import { PRD_SAMPLES } from '@/lib/input/prd-samples';

export function PrdSamplePicker({
  onSelect,
  disabled,
}: {
  onSelect: (body: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-500">Sample specs (click to load)</p>
      <div className="flex flex-wrap gap-1.5">
        {PRD_SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(sample.body)}
            className="chip px-2.5 py-1 text-[0.65rem] font-medium text-slate-300 transition hover:border-[rgb(var(--accent)/0.35)] hover:text-white disabled:opacity-50"
            title={sample.body.slice(0, 120) + '...'}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}
