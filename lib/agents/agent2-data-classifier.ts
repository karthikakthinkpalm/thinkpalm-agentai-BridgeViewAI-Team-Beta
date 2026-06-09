import type { ClassifiedMetric, MetricCategory, RequirementAnalysis } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';

const RULES: { pattern: RegExp; categories: MetricCategory[]; primary: MetricCategory; boost: number }[] = [
  { pattern: /position|lat|lng|ais|route|waypoint|geofence|heading|cog/i, categories: ['Spatial', 'Temporal'], primary: 'Spatial', boost: 0.15 },
  { pattern: /speed|sog|eta|progress|history|trend|time|duration|leg/i, categories: ['Temporal', 'KPI'], primary: 'Temporal', boost: 0.12 },
  { pattern: /fuel|tank|level|pct|rpm|load|kpi|cii|efficiency|consumption/i, categories: ['KPI', 'Temporal'], primary: 'KPI', boost: 0.1 },
  { pattern: /alert|alarm|critical|warning|incident|event/i, categories: ['Event'], primary: 'Event', boost: 0.14 },
  { pattern: /fleet|comparison|benchmark|vessel(s)?/i, categories: ['Comparison', 'KPI'], primary: 'Comparison', boost: 0.1 },
  { pattern: /crew|cert|roster|hierarchy|organization|parent/i, categories: ['Hierarchical', 'Event'], primary: 'Hierarchical', boost: 0.12 },
  { pattern: /weather|wind|wave/i, categories: ['KPI', 'Spatial'], primary: 'KPI', boost: 0.08 },
];

function classifyMetric(metric: RequirementAnalysis['metrics'][0]): ClassifiedMetric {
  const text = `${metric.name} ${metric.description} ${metric.entity ?? ''}`;
  const categories = new Set<MetricCategory>();
  let primary: MetricCategory = 'KPI';
  let confidence = 0.72;

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      rule.categories.forEach((c) => categories.add(c));
      primary = rule.primary;
      confidence = Math.min(0.98, confidence + rule.boost);
    }
  }

  if (categories.size === 0) {
    categories.add('KPI');
    primary = 'KPI';
    confidence = 0.7;
  }

  return {
    ...metric,
    categories: [...categories],
    primaryCategory: primary,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export interface Agent2Result {
  classifiedMetrics: ClassifiedMetric[];
  prompts: PromptRecord[];
}

export function runAgent2DataClassifier(requirements: RequirementAnalysis): Agent2Result {
  const classifiedMetrics = requirements.metrics.map(classifyMetric);

  const summary = classifiedMetrics
    .map((m) => `${m.name} → ${m.primaryCategory} (${m.categories.join('+')}) @ ${m.confidence}`)
    .join('\n');

  const prompts: PromptRecord[] = [
    {
      id: 'a2-classification',
      agent: 'AGENT 2',
      role: 'system',
      label: 'Data Classifier — Metric Categories',
      content: summary,
      techniques: ['Spatial/Temporal/KPI/Event/Comparison/Hierarchical taxonomy'],
    },
  ];

  return { classifiedMetrics, prompts };
}
