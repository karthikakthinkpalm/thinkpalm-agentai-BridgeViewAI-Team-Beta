export const WIDGET_TEMPLATES: Record<string, any> = {
  table: {
    description: "Standard data table for maritime lists (crew, alerts, vessels).",
    structure: {
      container: "w-full overflow-x-auto",
      table: "w-full border-collapse text-left text-sm",
      thead: "border-b border-white/10 text-slate-400 bg-slate-900/50",
      th: "px-4 py-3 font-medium",
      tbody: "divide-y divide-white/5",
      tr: "transition-colors hover:bg-slate-800/30",
      td: "px-4 py-3 text-slate-200"
    }
  },
  kpi: {
    description: "Key Performance Indicator dashboard grid.",
    structure: {
      container: "grid grid-cols-2 md:grid-cols-3 gap-4",
      card: "flex flex-col items-center justify-center rounded-xl bg-slate-800/50 p-4 border border-white/5",
      label: "text-xs font-medium text-slate-400 uppercase tracking-wider",
      value: "mt-2 text-2xl font-bold text-[rgb(var(--accent))]"
    }
  },
  alert: {
    description: "Alert or notification panel.",
    structure: {
      container: "space-y-3",
      itemContainer: "flex items-start gap-3 rounded-lg border p-3",
      critical: "border-rose-500/50 bg-rose-500/10 text-rose-100",
      warning: "border-amber-500/50 bg-amber-500/10 text-amber-100",
      info: "border-blue-500/40 bg-blue-500/10 text-blue-100",
      title: "text-sm font-semibold",
      description: "mt-1 text-xs opacity-80",
      timestamp: "text-xs font-mono opacity-60 ml-auto"
    }
  },
  card: {
    description: "Generic data card with flex layout.",
    structure: {
      container: "flex flex-col gap-4",
      row: "flex items-center justify-between rounded-lg bg-slate-800/40 px-4 py-3 border border-white/5",
      label: "text-sm text-slate-400",
      value: "text-sm font-semibold text-slate-100"
    }
  },
  list: {
    description: "Vertical list of items (e.g. crew roster, tasks).",
    structure: {
      container: "space-y-2",
      item: "flex items-center justify-between rounded-lg bg-slate-950/50 border border-white/5 px-4 py-3",
      mainText: "text-sm font-medium text-slate-100",
      subText: "text-xs text-slate-400",
      badge: "rounded-full px-2.5 py-1 text-xs font-medium bg-slate-800 text-slate-300"
    }
  }
};

export function getDesignSystemTemplate(type: string): string {
  const template = WIDGET_TEMPLATES[type.toLowerCase()];
  if (!template) {
    return JSON.stringify({
      error: `Unknown widget type '${type}'. Available types: ${Object.keys(WIDGET_TEMPLATES).join(', ')}`,
      guidance: "Fallback to default CardShell structure with generic flex layouts."
    });
  }
  return JSON.stringify(template, null, 2);
}
