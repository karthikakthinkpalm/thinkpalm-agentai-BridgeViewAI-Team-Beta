import featureDiscoveryConfig from '@/config/maritime/feature-discovery.json';
import visualizationRulesConfig from '@/config/maritime/visualization-rules.json';
import widgetDesignSystemConfig from '@/config/maritime/widget-design-system.json';
import widgetMapperConfig from '@/config/maritime/widget-mapper.json';
import type { FeatureRecommendation, MaritimeDomain, VesselType } from '@/lib/types/feature-discovery';
import type { VisualizationPriority } from '@/lib/types/visualization';

export type WidgetTemplate = {
  description: string;
  structure: Record<string, string>;
};

export interface ConfigFieldRule {
  patterns: string[];
  dataField: string;
  visualization: string;
  widget: string;
  archetype: string;
  reason: string;
  interaction: string;
  priority: VisualizationPriority;
}

export interface ConfigDomainRule {
  domain: MaritimeDomain;
  metricPatterns: string[];
  widgetPatterns: string[];
  defaultWidget: string;
  missingFeature: FeatureRecommendation;
}

const patternCache = new Map<string, RegExp>();

export function compilePattern(source: string, flags = 'i'): RegExp {
  const key = `${flags}:${source}`;
  let compiled = patternCache.get(key);
  if (!compiled) {
    compiled = new RegExp(source, flags);
    patternCache.set(key, compiled);
  }
  return compiled;
}

export function matchesAnyPattern(text: string, patterns: string[]): boolean {
  return patterns.some((p) => compilePattern(p).test(text));
}

export function getWidgetMapperConfig() {
  return widgetMapperConfig;
}

export function getWidgetDesignSystemConfig() {
  return widgetDesignSystemConfig.templates as Record<string, WidgetTemplate>;
}

export function getVisualizationRulesConfig() {
  return {
    priorityPatterns: visualizationRulesConfig.priorityPatterns as Record<string, string>,
    rules: visualizationRulesConfig.rules as ConfigFieldRule[],
  };
}

export function getFeatureDiscoveryConfig() {
  return featureDiscoveryConfig as {
    confidenceThreshold: number;
    allDomains: MaritimeDomain[];
    domainRules: ConfigDomainRule[];
    vesselTypeRules: { pattern: string; type: VesselType }[];
    vesselIntelligence: Record<string, FeatureRecommendation[]>;
    predictivePatterns: { pattern: string; feature: FeatureRecommendation }[];
    requirementSignals: Record<string, string>;
    domainFieldPatterns: { patterns: string[]; domain: MaritimeDomain }[];
    widgetArchetypes: { patterns: string[]; archetype: string }[];
    healthDomainGroups: Record<string, MaritimeDomain[]>;
  };
}

export function detectPriorityFromConfig(text: string): VisualizationPriority {
  const { priorityPatterns } = getVisualizationRulesConfig();
  const lower = text.toLowerCase();
  if (compilePattern(priorityPatterns['safety-critical']).test(lower)) return 'safety-critical';
  if (compilePattern(priorityPatterns.informational).test(lower)) return 'informational';
  return 'operational';
}

export function resolveWidgetArchetype(widget: string): string {
  const { widgetArchetypes } = getFeatureDiscoveryConfig();
  for (const rule of widgetArchetypes) {
    if (matchesAnyPattern(widget, rule.patterns.map((p) => p))) {
      return rule.archetype;
    }
  }
  return 'card';
}

export function inferDomainFromField(field: string): MaritimeDomain {
  const { domainFieldPatterns } = getFeatureDiscoveryConfig();
  const f = field.toLowerCase();
  for (const rule of domainFieldPatterns) {
    if (matchesAnyPattern(f, rule.patterns)) return rule.domain;
  }
  return 'Navigation';
}
