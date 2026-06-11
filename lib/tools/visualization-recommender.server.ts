import 'server-only';

import type { VisualizationAnalysis } from '@/lib/types/visualization';
import { detectPriorityFromConfig } from './config-loader';
import { llmRecommendVisualizations, withLlmFallback } from './llm-fallback';
import { buildAnalysis, recommendFromConfig } from './visualization-recommender';

export async function recommendVisualizationsAsync(
  prd: string,
  provider?: 'groq' | 'gemini'
): Promise<VisualizationAnalysis & { source: 'config' | 'llm' }> {
  const configRecs = recommendFromConfig(prd);
  const priority = detectPriorityFromConfig(prd);

  const { result, source } = await withLlmFallback(
    configRecs,
    (r) => r.length < 2 && prd.trim().length > 30,
    () => llmRecommendVisualizations(prd, priority, provider)
  );

  return { ...buildAnalysis(prd, result), source };
}
