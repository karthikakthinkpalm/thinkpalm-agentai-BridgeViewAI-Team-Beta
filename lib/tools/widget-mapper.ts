/** Keyword → canonical maritime widget names (config-driven + optional LLM fallback) */

import { getWidgetMapperConfig } from './config-loader';

const config = () => getWidgetMapperConfig();

export const ALL_MARITIME_WIDGETS = config().allWidgets;

export type MaritimeWidget = (typeof ALL_MARITIME_WIDGETS)[number];

export const WIDGET_ALIASES: Record<string, string> = config().aliases;

function mapWidgetsFromConfig(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const entry of config().keywordMap) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      if (!found.includes(entry.widget)) found.push(entry.widget);
    }
  }

  if (found.length > 0) return found;
  return [...config().defaultWidgets];
}

/** Sync config-driven widget mapping (used by live preview). */
export function mapWidgets(text: string): string[] {
  return mapWidgetsFromConfig(text);
}

export function normalizeWidgetName(name: string): string {
  return WIDGET_ALIASES[name] ?? name;
}

export function normalizeWidgetList(widgets: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of widgets) {
    const n = normalizeWidgetName(w);
    if (!seen.has(n)) {
      seen.add(n);
      result.push(n);
    }
  }
  return result;
}

/** Coerce API/store values into a widget name array */
export function asWidgetArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return normalizeWidgetList(
      value.map((w) => {
        if (typeof w === 'object' && w !== null && 'name' in w) {
          return String(w.name);
        }
        return String(w);
      })
    );
  }
  return fallback;
}
