import { create } from 'zustand';
import type { PromptRecord } from '@/lib/prompts/maritime-prompts';
import type { HierarchyNode } from '@/lib/preview/hierarchy';
import { asWidgetArray } from '@/lib/tools/widget-mapper';

interface LogEntry {
  time: string;
  agent: string;
  message: string;
}

interface SessionMemory {
  prdText: string;
  schema: object | null;
  components: Record<string, string>;
  agentLog: LogEntry[];
  status: 'idle' | 'running' | 'done' | 'error';
  widgetsFound: number;
  prompts: PromptRecord[];
  hierarchy: HierarchyNode | null;
  previewWidgets: string[];
  hiddenWidgets: string[];

  setPrd: (text: string) => void;
  setSchema: (s: object) => void;
  setStatus: (s: 'idle' | 'running' | 'done' | 'error') => void;
  addComponent: (name: string, code: string) => void;
  addLog: (agent: string, message: string) => void;
  setWidgetsFound: (n: number) => void;
  setPrompts: (prompts: PromptRecord[]) => void;
  setHierarchy: (h: HierarchyNode | null) => void;
  setPreviewWidgets: (widgets: string[]) => void;
  setHiddenWidgets: (widgets: string[]) => void;
  reset: () => void;
}

export const useMemory = create<SessionMemory>((set) => ({
  prdText: '',
  schema: null,
  components: {},
  agentLog: [],
  status: 'idle',
  widgetsFound: 0,
  prompts: [],
  hierarchy: null,
  previewWidgets: [],
  hiddenWidgets: [],

  setPrd: (prdText) => set({ prdText }),
  setSchema: (schema) => set({ schema }),
  setStatus: (status) => set({ status }),
  setWidgetsFound: (widgetsFound) => set({ widgetsFound }),
  setPrompts: (prompts) => set({ prompts }),
  setHierarchy: (hierarchy) => set({ hierarchy }),
  setPreviewWidgets: (previewWidgets) =>
    set({ previewWidgets: asWidgetArray(previewWidgets) }),
  setHiddenWidgets: (hiddenWidgets) =>
    set({ hiddenWidgets: asWidgetArray(hiddenWidgets) }),

  addComponent: (name, code) =>
    set((state) => ({
      components: { ...state.components, [name]: code },
    })),

  addLog: (agent, message) =>
    set((state) => ({
      agentLog: [
        ...state.agentLog,
        {
          time: new Date().toLocaleTimeString(),
          agent,
          message,
        },
      ],
    })),

  reset: () =>
    set({
      schema: null,
      components: {},
      agentLog: [],
      status: 'idle',
      widgetsFound: 0,
      prompts: [],
      hierarchy: null,
      previewWidgets: [],
      hiddenWidgets: [],
    }),
}));
