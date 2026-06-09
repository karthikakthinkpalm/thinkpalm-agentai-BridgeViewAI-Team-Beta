import 'server-only';

import { getWidgetMapperConfig } from './config-loader';
import { llmMapWidgets, withLlmFallback } from './llm-fallback';
import { mapWidgets } from './widget-mapper';

function isDefaultFallback(widgets: string[]): boolean {
  const defaults = getWidgetMapperConfig().defaultWidgets;
  return widgets.length === defaults.length && defaults.every((w) => widgets.includes(w));
}

/** Config + LLM fallback when keyword rules produce only default widgets. */
export async function mapWidgetsAsync(
  text: string
): Promise<{ widgets: string[]; source: 'config' | 'llm' }> {
  const configResult = mapWidgets(text);
  const { result, source } = await withLlmFallback(
    configResult,
    (r) => isDefaultFallback(r) && text.trim().length > 40,
    () => llmMapWidgets(text)
  );
  return { widgets: result, source };
}
