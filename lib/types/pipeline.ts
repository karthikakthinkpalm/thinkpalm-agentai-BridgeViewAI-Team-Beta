import type { VisualizationRecommendation } from './visualization';

export type MetricCategory =
  | 'Spatial'
  | 'Temporal'
  | 'KPI'
  | 'Event'
  | 'Comparison'
  | 'Hierarchical';

export interface ExtractedMetric {
  name: string;
  description: string;
  entity?: string;
  unit?: string;
}

export interface RequirementAnalysis {
  domain: string;
  priority: string;
  entities: string[];
  metrics: ExtractedMetric[];
  userGoal: string;
}

export interface ClassifiedMetric extends ExtractedMetric {
  categories: MetricCategory[];
  primaryCategory: MetricCategory;
  confidence: number;
}

export interface SelectedWidget {
  name: string;
  description: string;
  archetype: string;
  metrics: string[];
  visualization: string;
  reason: string;
  confidence: number;
  interaction: string;
  priority: string;
}

export type LayoutZone = 'hero' | 'primary' | 'secondary' | 'sidebar' | 'alert-strip';

export interface LayoutPlacement {
  widget: string;
  zone: LayoutZone;
  row: number;
  order: number;
  rationale: string;
}

export interface LayoutPlan {
  pattern: 'dashboard-grid' | 'bridge-split' | 'alert-first';
  placements: LayoutPlacement[];
  rationale: string;
}

export interface WidgetDefinition {
  name: string;
  description: string;
  archetype?: string;
  recommendations?: VisualizationRecommendation[];
  zone?: LayoutZone;
  layoutOrder?: number;
  visualization?: string;
  reason?: string;
}

export interface ParsedSchema {
  domain: string;
  widgets: WidgetDefinition[];
  layout: string;
  priority: string;
  requirements?: RequirementAnalysis;
  classifiedMetrics?: ClassifiedMetric[];
  selectedWidgets?: SelectedWidget[];
  layoutPlan?: LayoutPlan;
}

export interface UXReviewIssue {
  widget: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface UXReviewResult {
  passed: boolean;
  score: number;
  issues: UXReviewIssue[];
  summary: string;
}

export interface MaritimeReviewResult {
  approved: boolean;
  score: number;
  findings: string[];
  summary: string;
}

export interface PipelineResult {
  schema: ParsedSchema;
  components: Record<string, string>;
  tree: string[];
  prompts: import('@/lib/prompts/maritime-prompts').PromptRecord[];
  detectedWidgets: string[];
  visualizationAnalysis?: import('@/lib/types/visualization').VisualizationAnalysis;
  featureDiscovery?: import('@/lib/types/feature-discovery').FeatureDiscoveryResult;
  uxReview: UXReviewResult;
  maritimeReview: MaritimeReviewResult;
  agentTrace: { agent: string; status: string; detail: string }[];
  debugTrace?: {
    extractedMetrics: ExtractedMetric[];
    detectedPriority: string;
    selectedWidgetNames: string[];
    generationWarnings: string[];
    fallbackWidgetsUsed: string[];
  };
  warnings?: string[];
  fallbackWidgets?: string[];
  adaptivePlan?: {
    agents: string[];
    tools: string[];
    skipped: { id: string; type: 'agent' | 'tool'; reason: string }[];
    rationale: string;
    provisionedTools?: {
      id: string;
      description: string;
      delegateTo?: string;
      reason: string;
      source: 'catalog' | 'config' | 'llm';
    }[];
  };
  provisionedTools?: {
    id: string;
    description: string;
    delegateTo?: string;
    reason: string;
    source: 'catalog' | 'config' | 'llm';
  }[];
}
