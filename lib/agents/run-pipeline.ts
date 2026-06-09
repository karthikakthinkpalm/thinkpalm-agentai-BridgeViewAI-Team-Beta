import { runOrchestratedPipeline } from '@/lib/orchestration/orchestrator';

export async function runPipeline(prd: string) {
  return runOrchestratedPipeline(prd);
}

// Re-export types for backwards compatibility
export type { ParsedSchema, WidgetDefinition } from '../types/pipeline';
