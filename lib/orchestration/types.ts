import type { PromptRecord } from '@/lib/prompts/maritime-prompts';
import type { FeatureDiscoveryResult } from '@/lib/types/feature-discovery';
import type { VisualizationAnalysis } from '@/lib/types/visualization';
import type {
  ClassifiedMetric,
  LayoutPlan,
  MaritimeReviewResult,
  ParsedSchema,
  RequirementAnalysis,
  SelectedWidget,
  UXReviewResult,
} from '@/lib/types/pipeline';

export interface SkippedCapability {
  id: string;
  type: 'agent' | 'tool';
  reason: string;
}

export interface ProvisionedTool {
  id: string;
  description: string;
  delegateTo?: string;
  reason: string;
  source: 'catalog' | 'config' | 'llm';
}

export interface AdaptivePipelinePlan {
  agents: string[];
  tools: string[];
  skipped: SkippedCapability[];
  rationale: string;
  provisionedTools?: ProvisionedTool[];
}

export interface PipelineContext {
  prd: string;
  plan?: AdaptivePipelinePlan;
  provisionedTools?: ProvisionedTool[];
  requirements?: RequirementAnalysis;
  detectedWidgets?: string[];
  classifiedMetrics?: ClassifiedMetric[];
  selectedWidgets?: SelectedWidget[];
  enrichedWidgets?: SelectedWidget[];
  discovery?: FeatureDiscoveryResult;
  autoExpandedWidgets: string[];
  layoutPlan?: LayoutPlan;
  schema?: ParsedSchema;
  components?: Record<string, string>;
  visualizationAnalysis?: VisualizationAnalysis;
  uxReview?: UXReviewResult;
  maritimeReview?: MaritimeReviewResult;
  fallbackWidgets: string[];
  prompts: PromptRecord[];
  agentTrace: { agent: string; status: string; detail: string }[];
  warnings: string[];
  completedCapabilities: Set<string>;
  finalized: boolean;
}

export interface CapabilityResult {
  summary: string;
  status?: string;
}

export interface AgentDefinition {
  id: string;
  displayName: string;
  description: string;
  requires: string[];
  produces: string[];
  essential?: boolean;
  run: (ctx: PipelineContext) => Promise<CapabilityResult>;
}

export interface ToolDefinition {
  id: string;
  description: string;
  parameters: Record<string, unknown>;
  essential?: boolean;
  run: (args: Record<string, unknown>, ctx: PipelineContext) => Promise<unknown>;
}

export type GroqTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};
