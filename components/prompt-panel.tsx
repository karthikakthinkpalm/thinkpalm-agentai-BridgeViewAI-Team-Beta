'use client';

import type { PromptRecord } from '@/lib/prompts/maritime-prompts';
import { PROMPT_TECHNIQUES } from '@/lib/prompts/maritime-prompts';

export function PromptPanel({ prompts }: { prompts: PromptRecord[] }) {
  if (prompts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/50 p-4 text-xs font-mono text-slate-500">
        Prompts appear after Generate UI — Stitch live preview prompts first, then agent pipeline prompts.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-purple-400/20 bg-purple-400/5 p-3">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-purple-300">
          Prompt engineering techniques
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.values(PROMPT_TECHNIQUES).map((t) => (
            <span
              key={t}
              className="rounded-full border border-purple-400/20 bg-slate-950/60 px-2 py-0.5 text-[0.6rem] text-purple-200/90"
            >
              {t.split('—')[0]?.trim()}
            </span>
          ))}
        </div>
      </div>

      {prompts.map((p) => (
        <details
          key={p.id}
          className="group rounded-2xl border border-white/5 bg-slate-950/60 open:border-teal-400/30"
        >
          <summary className="cursor-pointer list-none px-3 py-2.5 font-mono text-xs">
            <span
              className={
                p.agent === 'STITCH'
                  ? 'text-sky-400'
                  : p.agent === 'AGENT 1'
                    ? 'text-teal-400'
                    : 'text-blue-400'
              }
            >
              {p.agent}
            </span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-slate-300">{p.label}</span>
            <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[0.6rem] text-slate-500">
              {p.role}
            </span>
          </summary>
          <div className="border-t border-white/5 px-3 pb-3">
            <div className="mb-2 flex flex-wrap gap-1 pt-2">
              {p.techniques.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[0.55rem] text-teal-300/90"
                >
                  {t.split('—')[0]?.trim()}
                </span>
              ))}
            </div>
            <pre className="custom-scrollbar max-h-40 overflow-auto rounded-xl bg-slate-950/80 p-3 text-[0.65rem] leading-relaxed text-slate-400 whitespace-pre-wrap">
              {p.content}
            </pre>
          </div>
        </details>
      ))}
    </div>
  );
}
