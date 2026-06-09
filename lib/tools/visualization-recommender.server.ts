import 'server-only';

import type { VisualizationAnalysis } from '@/lib/types/visualization';
import { detectPriorityFromConfig } from './config-loader';
import { llmRecommendVisualizations, withLlmFallback } from './llm-fallback';
import { buildAnalysis, recommendFromConfig } from './visualization-recommender';

/** Config + LLM fallback when fewer than 2 field rules match. */
export async function recommendVisualizationsAsync(
  prd: string
): Promise<VisualizationAnalysis & { source: 'config' | 'llm' }> {
  const configRecs = recommendFromConfig(prd);
  const priority = detectPriorityFromConfig(prd);

  const { result, source } = await withLlmFallback(
    configRecs,
    (r) => r.length < 2 && prd.trim().length > 30,
    () => llmRecommendVisualizations(prd, priority)
  );

  return { ...buildAnalysis(prd, result), source };
}
