import { runOrchestratedPipeline } from '@/lib/orchestration/orchestrator';

export async function runPipeline(
  prd: string,
  existingComponents?: Record<string, string>,
  llmProvider?: 'groq' | 'gemini'
) {
  return runOrchestratedPipeline(prd, existingComponents, llmProvider);
}

// Re-export types for backwards compatibility
export type { ParsedSchema, WidgetDefinition } from '../types/pipeline';
