'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMemory } from '@/lib/memory/session';
import { saveRun, loadHistory, HistoryEntry } from '@/lib/memory/persistent';
import { PromptPanel } from '@/components/prompt-panel';
import { HierarchyTree } from '@/components/hierarchy-tree';
import { CodeExportBar } from '@/components/code-export-bar';
import { DashboardStudio } from '@/components/dashboard-studio';
import { PrdSamplePicker } from '@/components/prd-sample-picker';
import { DashboardPreview } from '@/lib/preview/widget-previews';
import { parsePrdForPreview } from '@/lib/preview/parse-prd';
import { asWidgetArray } from '@/lib/tools/widget-mapper';
import { dedupePreviewWidgets } from '@/lib/preview/curated-widgets';
import { recommendVisualizations } from '@/lib/tools/visualization-recommender';
import { VizRecommendationsPanel } from '@/components/viz-recommendations-panel';
import { FeatureDiscoveryPanel } from '@/components/feature-discovery-panel';
import { AgentTracePanel } from '@/components/agent-trace-panel';
import { runFeatureDiscovery } from '@/lib/tools/feature-discovery';
import type { FeatureDiscoveryResult } from '@/lib/types/feature-discovery';
import { DEFAULT_PRD_SAMPLE } from '@/lib/input/prd-samples';
import type { HierarchyNode } from '@/lib/preview/hierarchy';
import type { PromptRecord } from '@/lib/prompts/maritime-prompts';

const DEFAULT_PRD = DEFAULT_PRD_SAMPLE.body;

type SchemaSummary = {
  domain?: string;
  layout?: string;
  priority?: string;
  widgets?: string[];
};

type CenterTab = 'memory' | 'prompts' | 'studio' | 'preview' | 'trace';
type ThemeId = 'ocean' | 'harbor' | 'abyss';

export default function Home() {
  const {
    prdText, schema, components, agentLog,
    status, widgetsFound, prompts, hierarchy, previewWidgets, hiddenWidgets, fallbackWidgets, visualizations, llmProvider,
    debugTrace,
    setPrd, setSchema, setStatus, addComponent,
    addLog, setWidgetsFound, setPrompts, setHierarchy, setPreviewWidgets, setHiddenWidgets, setFallbackWidgets, setLlmProvider,
    setVisualizations, featureDiscovery, setFeatureDiscovery, setDebugTrace, reset,
  } = useMemory();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedWidget, setSelectedWidget] = useState('');
  const [centerTab, setCenterTab] = useState<CenterTab>('preview');
  const [theme, setTheme] = useState<ThemeId>('ocean');

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  useEffect(() => {
    if (!prdText && status === 'idle') {
      setPrd(DEFAULT_PRD);
    }
  }, [prdText, status, setPrd]);

  useEffect(() => {
    // Apply theme at document root so CSS variables affect all descendants.
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const schemaObj = schema as SchemaSummary | null;

  const parsedPreview = useMemo(
    () => parsePrdForPreview(prdText, schemaObj),
    [prdText, schemaObj]
  );

  const liveVizAnalysis = useMemo(
    () => recommendVisualizations(prdText),
    [prdText]
  );

  const liveFeatureDiscovery = useMemo(
    () => runFeatureDiscovery(prdText),
    [prdText]
  );

  const displayVisualizations =
    visualizations.length > 0 ? visualizations : liveVizAnalysis.recommendations;

  const displayFeatureDiscovery: FeatureDiscoveryResult | null =
    featureDiscovery ?? liveFeatureDiscovery;

  // Keep widget list in sync with PRD keywords (live preview)
  useEffect(() => {
    const detected = parsePrdForPreview(prdText).widgets;
    const safePrev = asWidgetArray(useMemory.getState().previewWidgets);
    const kept = safePrev.filter((w) => detected.includes(w));
    const added = detected.filter((w) => !kept.includes(w));
    const next = [...kept, ...added];
    setPreviewWidgets(next.length > 0 ? next : detected);
  }, [prdText, setPreviewWidgets]);

  async function runPipeline() {
    if (!prdText.trim()) return;
    
    const isContinuing = fallbackWidgets.length > 0;
    
    if (!isContinuing) {
      reset();
    }
    
    setStatus('running');
    setCenterTab('memory');

    addLog('SYSTEM', '7-agent pipeline started');
    addLog('AGENT 1', 'Requirement Analyzer — extracting entities and metrics...');

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prd: prdText, 
          existingComponents: isContinuing ? components : undefined,
          llmProvider 
        }),
      });

      const data = await res.json();

      if (data.error) {
        addLog('SYSTEM', `Error: ${data.error}`);
        if (data.detail) addLog('SYSTEM', String(data.detail));
        setStatus('error');
        return;
      }

      setSchema(data.schema);
      setWidgetsFound(data.tree.length);
      setPrompts(data.prompts as PromptRecord[]);
      setHierarchy(data.hierarchy as HierarchyNode);
      if (data.visualizationAnalysis?.recommendations) {
        setVisualizations(data.visualizationAnalysis.recommendations);
      }
      if (data.featureDiscovery) {
        setFeatureDiscovery(data.featureDiscovery);
      }
      setPreviewWidgets(asWidgetArray(data.schema?.widgets, asWidgetArray(data.tree)));
      setFallbackWidgets(data.fallbackWidgets ?? []);
      setDebugTrace(data.debugTrace || null);

      const trace = (data.agentTrace as { agent: string; status: string; detail: string }[]) ?? [];
      for (const step of trace) {
        addLog(step.agent, step.detail ?? step.status ?? 'completed');
      }

      for (const warning of (data.warnings as string[] | undefined) ?? []) {
        addLog('SYSTEM', warning);
      }

      for (const name of data.tree) {
        addComponent(name, data.components[name]);
      }

      addLog('PREVIEW', 'Live dashboard preview ready');
      addLog('EXPORT', 'Use Copy / Download to export production code');

      await saveRun(prdText, data.schema, data.tree);
      addLog('MEMORY', 'Run saved to long-term memory');

      const updated = await loadHistory();
      setHistory(updated);

      setStatus('done');
      addLog('SYSTEM', 'Pipeline complete — preview + code export available');
      setCenterTab('preview');

      if (data.tree.length > 0) setSelectedWidget(data.tree[0]);
    } catch (err) {
      addLog('SYSTEM', `Failed: ${String(err)}`);
      setStatus('error');
    }
  }

  const tree = Object.keys(components);
  const schemaDomain = schemaObj?.domain ?? parsedPreview.domain;
  const schemaLayout = schemaObj?.layout ?? parsedPreview.layout;

  const statusLabel =
    status === 'running' ? 'Agents running' :
    status === 'done' ? 'Ready' :
    status === 'error' ? 'Needs attention' : 'Standing by';

  const statusTone =
    status === 'running' ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' :
    status === 'done' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' :
    status === 'error' ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' :
    'border-slate-600/60 bg-slate-900/70 text-slate-300';

  const centerTabs: { id: CenterTab; label: string }[] = [
    { id: 'memory', label: 'Memory' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'studio', label: 'Studio' },
    { id: 'preview', label: 'Live Preview' },
    { id: 'trace', label: 'Trace' },
  ];

  const visiblePreviewWidgets = useMemo(() => {
    const detected = new Set(parsedPreview.widgets);
    const safePreview = asWidgetArray(previewWidgets);
    const safeHidden = asWidgetArray(hiddenWidgets);
    const ordered = safePreview.filter((w) => detected.has(w));
    const list = ordered.length > 0 ? ordered : parsedPreview.widgets;
    return dedupePreviewWidgets(list.filter((w) => !safeHidden.includes(w)));
  }, [parsedPreview.widgets, previewWidgets, hiddenWidgets]);

  return (
    <main
      className="ocean-grid min-h-screen overflow-hidden text-white"
      style={{ backgroundColor: 'rgb(var(--bg))' }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-orb left-[-8rem] top-[-7rem] bg-[rgb(var(--accent)/0.22)]" />
        <div className="glow-orb bottom-[-10rem] right-[-6rem] bg-[rgb(var(--accent-2)/0.16)] delay-700" />
        <div className="glow-orb left-[45%] top-[18%] h-44 w-44 bg-[rgb(var(--border)/0.10)] delay-1000" />
      </div>

      <div className="relative z-10 border-b border-white/10 bg-[rgb(var(--surface-2)/0.75)] px-6 py-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="animate-fade-in">
            <p className="text-[0.65rem] uppercase tracking-[0.45em] text-slate-400">Maritime UI Generator</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[rgb(var(--surface)/0.55)] text-[0.9rem] font-semibold text-slate-200">
                BV
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">BridgeView AI</h1>
                <p className="text-sm text-slate-400">
                  Reads specs → proposes widget hierarchy → live preview → exports React code.
                </p>
              </div>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[rgb(var(--surface-2)/0.35)] p-1">
              <button
                type="button"
                onClick={() => setTheme('ocean')}
                className={`chip px-3 py-1 text-[0.65rem] font-medium transition ${
                  theme === 'ocean' ? 'bg-[rgb(var(--accent)/0.18)] text-white border-[rgb(var(--accent)/0.25)]' : 'text-slate-300'
                }`}
              >
                Ocean
              </button>
              <button
                type="button"
                onClick={() => setTheme('harbor')}
                className={`chip px-3 py-1 text-[0.65rem] font-medium transition ${
                  theme === 'harbor' ? 'bg-[rgb(var(--accent)/0.18)] text-white border-[rgb(var(--accent)/0.25)]' : 'text-slate-300'
                }`}
              >
                Harbor
              </button>
              <button
                type="button"
                onClick={() => setTheme('abyss')}
                className={`chip px-3 py-1 text-[0.65rem] font-medium transition ${
                  theme === 'abyss' ? 'bg-[rgb(var(--accent)/0.18)] text-white border-[rgb(var(--accent)/0.25)]' : 'text-slate-300'
                }`}
              >
                Abyss
              </button>
            </div>
            
            {/* LLM Provider Toggle */}
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[rgb(var(--surface-2)/0.35)] p-1 ml-2">
              <button
                type="button"
                onClick={() => setLlmProvider('gemini')}
                className={`chip px-3 py-1 text-[0.65rem] font-medium transition ${
                  llmProvider === 'gemini' ? 'bg-[rgb(var(--accent)/0.18)] text-white border-[rgb(var(--accent)/0.25)]' : 'text-slate-300'
                }`}
              >
                Gemini (Free)
              </button>
              <button
                type="button"
                onClick={() => setLlmProvider('groq')}
                className={`chip px-3 py-1 text-[0.65rem] font-medium transition ${
                  llmProvider === 'groq' ? 'bg-[rgb(var(--accent)/0.18)] text-white border-[rgb(var(--accent)/0.25)]' : 'text-slate-300'
                }`}
              >
                Groq (Llama 3)
              </button>
            </div>

            <span className="chip flex items-center gap-2 px-3 py-1.5 text-[0.65rem] font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: 'rgb(var(--accent))' }}
                aria-hidden="true"
              />
              Theme: {theme}
            </span>

            <span className="chip px-3 py-1.5 text-[0.65rem] font-medium text-slate-200">7-Agent Pipeline</span>
            <span className="chip px-3 py-1.5 text-[0.65rem] font-medium text-slate-200">Analyze → Classify → Generate</span>
            <span className="chip px-3 py-1.5 text-[0.65rem] font-medium text-slate-200">Live Preview</span>
            <span className={`rounded-full border px-3 py-1.5 ${statusTone}`}>
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${status === 'running' ? 'animate-ping bg-amber-300' : 'bg-current'}`} />
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid h-[calc(100vh-97px)] grid-cols-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(340px,1fr)_minmax(320px,1fr)_minmax(300px,0.9fr)] xl:overflow-hidden">

        {/* LEFT — Spec input */}
        <section className="glass-panel animate-panel-rise flex min-h-[32rem] flex-col overflow-hidden xl:min-h-0">
          <div className="border-b border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">Product Spec</p>
              <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[0.65rem] font-mono text-slate-400">{prdText.length} chars</span>
            </div>
            <textarea
              value={prdText}
              onChange={(e) => setPrd(e.target.value)}
              placeholder="Paste your maritime PRD..."
              className="h-40 w-full resize-none rounded-2xl border border-slate-700/80 bg-slate-950/80 p-4 text-sm leading-6 text-slate-200 shadow-inner shadow-black/30 outline-none transition placeholder:text-slate-600 focus:border-teal-400/80 focus:ring-4 focus:ring-teal-400/10"
            />
            <PrdSamplePicker
              disabled={status === 'running'}
              onSelect={(body) => setPrd(body)}
            />
            <button
              onClick={runPipeline}
              disabled={status === 'running' || !prdText.trim()}
              className="primary-button group relative mt-3 w-full overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition duration-700 group-hover:translate-x-full" />
              <span className="relative">
                {status === 'running'
                  ? '⟳ Agents running...'
                  : fallbackWidgets.length > 0
                  ? '⚡ Generate Remaining Widgets'
                  : '⚡ Generate UI'}
              </span>
            </button>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-slate-400">Agent Log</p>
            <div className="space-y-2">
              {agentLog.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/50 p-4 text-xs font-mono text-slate-500">
                  Waiting for pipeline...
                </p>
              )}
              {agentLog.map((log, i) => (
                <div key={i} className="animate-fade-in flex gap-2 rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-xs font-mono">
                  <span className="text-slate-600">{log.time}</span>
                  <span className={
                    log.agent === 'AGENT 1' ? 'text-teal-400' :
                    log.agent === 'AGENT 2' ? 'text-blue-400' :
                    log.agent === 'AGENT 3' ? 'text-violet-400' :
                    log.agent === 'AGENT 4' ? 'text-indigo-400' :
                    log.agent === 'AGENT 5' ? 'text-cyan-400' :
                    log.agent === 'AGENT 6' ? 'text-emerald-400' :
                    log.agent === 'AGENT 7' ? 'text-orange-400' :
                    log.agent === 'BRIDGEVIEW' ? 'text-pink-400' :
                    log.agent === 'ADAPTIVE PLAN' ? 'text-fuchsia-400' :
                    log.agent === 'TOOL PROVISIONER' ? 'text-lime-400' :
                    log.agent.includes('SKIPPED') || (log.message?.toLowerCase().includes('skipped') ?? false) ? 'text-slate-500' :
                    log.agent === 'PREVIEW' ? 'text-cyan-400' :
                    log.agent === 'EXPORT' ? 'text-amber-400' :
                    log.agent === 'MEMORY' ? 'text-purple-400' :
                    'text-slate-400'
                  }>
                    {log.agent}
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CENTER — Memory / Prompts / Studio / Live Preview */}
        <section className="glass-panel animate-panel-rise flex min-h-[32rem] flex-col overflow-hidden delay-150 xl:min-h-0">
          <div className="flex border-b border-white/10">
            {centerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCenterTab(tab.id)}
                className={`flex-1 px-2 py-3 font-mono text-[0.65rem] uppercase tracking-wider transition ${
                  centerTab === tab.id
                    ? 'border-b-2 border-teal-400 bg-teal-400/10 text-teal-200'
                    : 'text-slate-500 hover:bg-slate-900/50 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
            {centerTab === 'memory' && (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="metric-card">
                    <div className="text-purple-300">STATUS</div>
                    <div className="mt-1 text-slate-100">{status}</div>
                  </div>
                  <div className="metric-card">
                    <div className="text-purple-300">WIDGETS</div>
                    <div className="mt-1 text-slate-100">{widgetsFound || visiblePreviewWidgets.length || '—'}</div>
                  </div>
                  <div className="metric-card col-span-2">
                    <div className="text-purple-300">DOMAIN / LAYOUT</div>
                    <div className="mt-1 truncate text-slate-100">{schemaDomain} · {schemaLayout}</div>
                  </div>
                </div>
                <p className="mb-3 font-mono text-xs text-slate-500">
                  Agents 1–4 propose this component tree; Agents 5–7 validate generated code.
                </p>
                <HierarchyTree
                  hierarchy={hierarchy}
                  selectedId={selectedWidget}
                  onSelect={(id) => {
                    setSelectedWidget(id);
                    setCenterTab('preview');
                  }}
                />
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-slate-500">
                    BridgeView — Feature Discovery
                  </p>
                  <FeatureDiscoveryPanel discovery={displayFeatureDiscovery} />
                </div>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-slate-500">
                    UX Architect — Visualization Analysis
                  </p>
                  <VizRecommendationsPanel recommendations={displayVisualizations} />
                </div>
              </>
            )}
            {centerTab === 'prompts' && <PromptPanel prompts={prompts} />}
            {centerTab === 'studio' && (
              <DashboardStudio
                widgets={
                  asWidgetArray(previewWidgets).length
                    ? asWidgetArray(previewWidgets)
                    : parsedPreview.widgets
                }
                hiddenWidgets={hiddenWidgets}
                onChangeOrder={(next) => setPreviewWidgets(next)}
                onToggleHidden={(widget) => {
                  setHiddenWidgets(
                    hiddenWidgets.includes(widget)
                      ? hiddenWidgets.filter((w) => w !== widget)
                      : [...hiddenWidgets, widget]
                  );
                }}
                onShowAll={() => setHiddenWidgets([])}
              />
            )}
            {centerTab === 'preview' && (
              <>
                <p className="mb-3 text-xs text-slate-500">
                  Curated maritime visuals · {visiblePreviewWidgets.length} widget{visiblePreviewWidgets.length === 1 ? '' : 's'}
                </p>
                <DashboardPreview
                  widgets={visiblePreviewWidgets}
                  prd={prdText}
                  schema={schemaObj}
                />
              </>
            )}
            {centerTab === 'trace' && (
              <div className="h-full">
                {debugTrace ? (
                  <AgentTracePanel trace={debugTrace} />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-sm text-slate-500">
                    No trace data available. Run the pipeline first.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CODE + EXPORT */}
        <section className="glass-panel animate-panel-rise flex min-h-[32rem] flex-col overflow-hidden delay-300 xl:min-h-0">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">Production Code</p>
              <span className="rounded-full bg-teal-400/10 px-2.5 py-1 text-[0.65rem] font-mono text-teal-200">{tree.length} files</span>
            </div>
          </div>

          {tree.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-teal-300/20 bg-teal-300/10 text-3xl">⌁</div>
                <h2 className="text-lg font-semibold text-slate-200">No exported code yet</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Run the pipeline to generate production-ready React TSX components with copy and download export.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 p-3 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {tree.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedWidget(name)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-xs font-mono flex items-center gap-2 transition ${
                      selectedWidget === name
                        ? 'border border-teal-400/60 bg-teal-400/15 text-teal-100'
                        : 'border border-white/5 bg-slate-950/60 text-slate-300 hover:bg-slate-900/80'
                    }`}
                  >
                    <span className="text-emerald-400">✓</span>
                    {name}.tsx
                  </button>
                ))}
              </div>

              <CodeExportBar
                selectedWidget={selectedWidget}
                code={components[selectedWidget] ?? ''}
                allComponents={components}
              />

              <div className="custom-scrollbar flex-1 overflow-auto p-4">
                {selectedWidget && (
                  <>
                    <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                      {selectedWidget}.tsx
                    </p>
                    <pre className="rounded-2xl border border-slate-700/70 bg-slate-950/85 p-4 text-xs font-mono leading-relaxed text-yellow-200 whitespace-pre-wrap shadow-inner">
                      {components[selectedWidget]}
                    </pre>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* HISTORY */}
        <section className="glass-panel animate-panel-rise flex min-h-[24rem] flex-col overflow-hidden delay-500 xl:min-h-0">
          <div className="border-b border-white/10 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">Long-Term Memory</p>
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <p className="text-xs font-mono text-slate-600">No saved runs yet.</p>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="cursor-pointer rounded-2xl border border-slate-800/90 bg-slate-950/70 p-3 transition hover:border-purple-300/40"
                  onClick={() => setPrd(entry.prd)}
                >
                  <p className="font-mono text-[0.65rem] text-slate-500">{entry.savedAt}</p>
                  <p className="mt-1 truncate text-sm text-slate-200">{entry.prd}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.widgets.map((w) => (
                      <span key={w} className="rounded-full bg-slate-800/90 px-2 py-0.5 text-[0.6rem] font-mono text-teal-300">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
