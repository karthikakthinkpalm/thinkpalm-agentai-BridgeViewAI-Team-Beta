import 'server-only';

import toolCatalog from '@/config/maritime/tool-catalog.json';
import type { RequirementAnalysis } from '@/lib/types/pipeline';
import { createChatCompletion } from '@/lib/llm-router';
import { parseJsonFromLlm } from '@/lib/parse-llm-json';
import { matchesAnyPattern } from '@/lib/tools/config-loader';
import { getAllTools, getTool, registerDynamicTool } from './registry';
import type { AdaptivePipelinePlan, ProvisionedTool, ToolDefinition } from './types';

interface CatalogTemplate {
  id: string;
  aliases: string[];
  delegateTo: string;
  description: string;
}

function matchCatalogFromText(text: string): CatalogTemplate[] {
  const lower = text.toLowerCase();
  return (toolCatalog.templates as CatalogTemplate[]).filter((t) =>
    t.aliases.some((alias) => lower.includes(alias.toLowerCase()))
  );
}

function registerFromTemplate(template: CatalogTemplate, reason: string): ProvisionedTool | null {
  const base = getTool(template.delegateTo);
  if (!base || getTool(template.id)) return null;

  const delegated: ToolDefinition = {
    id: template.id,
    description: `${template.description} (delegates to ${template.delegateTo})`,
    parameters: { ...base.parameters },
    async run(args, ctx) {
      return base.run(args, ctx);
    },
  };

  registerDynamicTool(delegated);
  return {
    id: template.id,
    description: template.description,
    delegateTo: template.delegateTo,
    reason,
    source: 'catalog',
  };
}

async function llmSuggestTools(
  prd: string,
  requirements: RequirementAnalysis,
  existingToolIds: string[],
  provider?: 'groq' | 'gemini'
): Promise<{ id: string; delegateTo: string; description: string; reason: string }[]> {
  const catalogIds = (toolCatalog.templates as CatalogTemplate[]).map((t) => t.id);
  const baseTools = ['map_widgets', 'recommend_visualizations', 'feature_discovery', 'get_design_system_template'];

  const { response } = await createChatCompletion(
    {
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a maritime pipeline tool advisor. Respond with ONLY a JSON object (no prose):
{ "tools": [{ "id": string, "delegateTo": string, "description": string, "reason": string }] }
Rules:
- id must be snake_case, unique, not already in existing tools
- delegateTo MUST be one of: ${baseTools.join(', ')} OR one of catalog ids: ${catalogIds.join(', ')}
- Only suggest tools clearly required by the PRD; max 4
- Prefer catalog ids when aliases match`,
        },
        {
          role: 'user',
          content: `PRD:\n${prd.slice(0, 4000)}\n\nDomain: ${requirements.domain}\nMetrics: ${requirements.metrics.map((m) => m.name).join(', ')}\nPriority: ${requirements.priority}\nExisting tools: ${existingToolIds.join(', ') || 'none'}`,
        },
      ],
    },
    'ToolProvisioner',
    { provider }
  );

  const parsed = parseJsonFromLlm<{
    tools?: { id: string; delegateTo: string; description: string; reason: string }[];
  }>(response.choices[0]?.message?.content ?? '');

  return parsed?.tools ?? [];
}

function registerLlmTool(
  spec: { id: string; delegateTo: string; description: string; reason: string }
): ProvisionedTool | null {
  if (getTool(spec.id)) return null;

  const catalogEntry = (toolCatalog.templates as CatalogTemplate[]).find((t) => t.id === spec.id);
  if (catalogEntry) {
    return registerFromTemplate(catalogEntry, spec.reason);
  }

  const base = getTool(spec.delegateTo);
  if (!base) return null;

  registerDynamicTool({
    id: spec.id,
    description: spec.description,
    parameters: { ...base.parameters },
    async run(args, ctx) {
      return base.run(args, ctx);
    },
  });

  return {
    id: spec.id,
    description: spec.description,
    delegateTo: spec.delegateTo,
    reason: spec.reason,
    source: 'llm',
  };
}

/** Analyze PRD + requirements and register any missing tools; extend the adaptive plan. */
export async function provisionToolsForPrd(
  prd: string,
  requirements: RequirementAnalysis,
  plan: AdaptivePipelinePlan,
  provider?: 'groq' | 'gemini'
): Promise<{ added: ProvisionedTool[]; plan: AdaptivePipelinePlan }> {
  const text = `${prd}\n${requirements.domain}\n${requirements.metrics.map((m) => `${m.name} ${m.description}`).join('\n')}`;
  const added: ProvisionedTool[] = [];
  const toolSet = new Set(plan.tools);

  for (const template of matchCatalogFromText(text)) {
    if (toolSet.has(template.id) || toolSet.has(template.delegateTo)) continue;
    const provisioned = registerFromTemplate(template, `PRD matched catalog alias for ${template.id}`);
    if (provisioned) {
      added.push(provisioned);
      toolSet.add(template.id);
    }
  }

  const missingBase = ['recommend_visualizations', 'map_widgets', 'feature_discovery'].filter(
    (id) => matchesAnyPattern(text, [getTriggerPatterns(id)]) && !toolSet.has(id) && getTool(id)
  );

  for (const id of missingBase) {
    toolSet.add(id);
    added.push({
      id,
      description: getTool(id)!.description,
      delegateTo: id,
      reason: `Baseline tool activated for PRD keyword match`,
      source: 'config',
    });
  }

  if (process.env.GROQ_API_KEY && process.env.DISABLE_TOOL_PROVISIONER_LLM !== 'true') {
    try {
      const suggestions = await llmSuggestTools(prd, requirements, [...toolSet, ...getAllTools().map((t) => t.id)], provider);
      for (const spec of suggestions) {
        if (toolSet.has(spec.id)) continue;
        const provisioned = registerLlmTool(spec);
        if (provisioned) {
          added.push(provisioned);
          toolSet.add(spec.id);
        }
      }
    } catch (err) {
      console.warn('Tool provisioner LLM unavailable — using catalog matches only', err);
    }
  }

  const updatedPlan: AdaptivePipelinePlan = {
    ...plan,
    tools: [...toolSet],
    provisionedTools: [...(plan.provisionedTools ?? []), ...added],
    rationale: `${plan.rationale} · ${added.length} tool(s) provisioned for this PRD`,
  };

  return { added, plan: updatedPlan };
}

function getTriggerPatterns(toolId: string): string {
  const triggers: Record<string, string> = {
    recommend_visualizations: 'chart|map|gauge|visualization|graph|heatmap',
    map_widgets: 'widget|tracker|panel|gauge|fuel|crew|alert',
    feature_discovery: 'coverage|missing|gap|fleet|domain|recommend',
  };
  return triggers[toolId] ?? '';
}
