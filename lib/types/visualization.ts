export type VisualizationPriority = 'safety-critical' | 'operational' | 'informational';

export type FieldDataType =
  | 'numerical'
  | 'categorical'
  | 'temporal'
  | 'spatial'
  | 'timeseries'
  | 'boolean'
  | 'text'
  | 'structured';

export interface FieldDimensions {
  spatial: boolean;
  temporal: boolean;
  categorical: boolean;
  numerical: boolean;
}

export interface FieldClassification {
  field: string;
  dataType: FieldDataType;
  dimensions: FieldDimensions;
  monitoringObjective: string;
  sampleSummary: string;
}

export interface VisualizationRecommendation {
  dataField: string;
  visualization: string;
  widget: string;
  archetype: string;
  reason: string;
  interaction: string;
  priority: VisualizationPriority;
  confidence?: number;
  classification?: FieldClassification;
  semanticDomain?: string;
  visualPattern?: string;
}

export interface EnrichedWidgetDefinition {
  name: string;
  description: string;
  archetype?: string;
  recommendations?: VisualizationRecommendation[];
}

export interface VisualizationAnalysis {
  recommendations: VisualizationRecommendation[];
  detectedFields: string[];
  priority: VisualizationPriority;
  monitoringObjective?: string;
  domainContext?: string;
}

export interface DatasetVizInput {
  dataset: Record<string, unknown>;
  domainContext?: string;
  userGoal?: string;
}

export interface DatasetVizRecommendation {
  field: string;
  widget: string;
  visualization: string;
  archetype: string;
  reason: string;
  confidence: number;
  interaction: string;
  priority: VisualizationPriority;
  classification: FieldClassification;
}

export interface DatasetVizOutput {
  recommendations: DatasetVizRecommendation[];
  monitoringObjective: string;
  domainContext: string;
  userGoal: string;
}
