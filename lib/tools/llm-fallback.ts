import 'server-only';

import { createChatCompletion } from '@/lib/llm-router';
import { parseJsonFromLlm } from '@/lib/parse-llm-json';
import type { FeatureRecommendation } from '@/lib/types/feature-discovery';
import type { VisualizationPriority, VisualizationRecommendation } from '@/lib/types/visualization';
import { getWidgetDesignSystemConfig, getWidgetMapperConfig } from './config-loader';

export function isLlmEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY) && process.env.DISABLE_LLM_TOOL_FALLBACK !== 'true';
}

export async function llmMapWidgets(text: string, provider?: 'groq' | 'gemini'): Promise<string[]> {
  const catalog = getWidgetMapperConfig().allWidgets;
  const { response } = await createChatCompletion(
    {
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You map maritime PRD text to dashboard widgets. Only return widgets from this catalog: ${catalog.join(', ')}. Respond with JSON: { "widgets": string[] }`,
        },
        { role: 'user', content: text.slice(0, 4000) },
      ],
    },
    'llmMapWidgets',
    { provider }
  );

  const parsed = parseJsonFromLlm<{ widgets?: string[] }>(response.choices[0]?.message?.content ?? '');
  const widgets = parsed?.widgets?.filter((w) => catalog.includes(w)) ?? [];
  return widgets.length > 0 ? widgets : getWidgetMapperConfig().defaultWidgets;
}

export async function llmRecommendVisualizations(
  prd: string,
  priority: VisualizationPriority,
  provider?: 'groq' | 'gemini'
): Promise<VisualizationRecommendation[]> {
  const { response } = await createChatCompletion(
    {
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You are a maritime data visualization expert. Given a PRD, recommend field-level visualizations.
Respond with JSON: { "recommendations": [{ "dataField", "visualization", "widget", "archetype", "reason", "interaction", "priority" }] }
Use archetypes: table, kpi, alert, card, list, gauge, route-map, wind-rose, heatmap, timeline, bullet-chart.
Priority must be one of: safety-critical, operational, informational. Default session priority: ${priority}.`,
        },
        { role: 'user', content: prd.slice(0, 6000) },
      ],
    },
    'llmRecommendVisualizations',
    { provider }
  );

  const parsed = parseJsonFromLlm<{ recommendations?: VisualizationRecommendation[] }>(
    response.choices[0]?.message?.content ?? ''
  );
  return parsed?.recommendations ?? [];
}

export async function llmDesignSystemTemplate(archetype: string, provider?: 'groq' | 'gemini'): Promise<string> {
  const known = Object.keys(getWidgetDesignSystemConfig());
  const { response } = await createChatCompletion(
    {
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Generate a maritime dashboard widget design-system template as JSON matching this shape:
{ "description": string, "structure": { "key": "tailwind-class or layout hint", ... } }
Known archetypes for reference: ${known.join(', ')}`,
        },
        { role: 'user', content: `Create a design template for archetype: ${archetype}` },
      ],
    },
    'llmDesignSystemTemplate',
    { provider }
  );

  const parsed = parseJsonFromLlm<{ description?: string; structure?: Record<string, string> }>(
    response.choices[0]?.message?.content ?? ''
  );
  if (parsed?.description && parsed.structure) {
    return JSON.stringify(parsed, null, 2);
  }
  return JSON.stringify({
    description: `LLM-generated ${archetype} widget structure`,
    structure: {
      container: 'flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5',
      content: 'Apply maritime CardShell layout with accent labels and mock data',
    },
  });
}

export async function llmFeatureRecommendations(
  prd: string,
  missingDomains: string[],
  domainContext?: string,
  configRecs?: FeatureRecommendation[],
  provider?: 'groq' | 'gemini'
): Promise<FeatureRecommendation[]> {
  const { response } = await createChatCompletion(
    {
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You recommend missing maritime dashboard features. Respond with JSON:
{ "recommendations": [{ "feature", "widget", "domain", "businessValue", "priority", "confidence", "reason" }] }
priority: critical|high|medium. confidence: 0-1. domain: Navigation|Weather|Machinery|Safety|Compliance|Crew|Cargo|Fleet|Security|Sustainability
Context domain: ${domainContext ?? 'Unknown'}
Config recommendations: ${JSON.stringify(configRecs ?? [])}`,
        },
        {
          role: 'user',
          content: `PRD:\n${prd.slice(0, 4000)}\n\nMissing domains: ${missingDomains.join(', ')}`,
        },
      ],
    },
    'llmFeatureRecommendations',
    { provider }
  );

  const parsed = parseJsonFromLlm<{ recommendations?: FeatureRecommendation[] }>(
    response.choices[0]?.message?.content ?? ''
  );
  return (parsed?.recommendations ?? []).filter((r) => r.confidence > 0.7);
}

export async function withLlmFallback<T>(
  configResult: T,
  isSparse: (result: T) => boolean,
  llmFn: () => Promise<T>
): Promise<{ result: T; source: 'config' | 'llm' }> {
  if (!isSparse(configResult) || !isLlmEnabled()) {
    return { result: configResult, source: 'config' };
  }
  try {
    const llmResult = await llmFn();
    return { result: llmResult, source: 'llm' };
  } catch (err) {
    console.warn('LLM tool fallback failed — using config result', err);
    return { result: configResult, source: 'config' };
  }
}
