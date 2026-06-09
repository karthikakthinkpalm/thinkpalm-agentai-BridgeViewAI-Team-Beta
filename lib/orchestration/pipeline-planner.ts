import 'server-only';

import type { RequirementAnalysis } from '@/lib/types/pipeline';
import pipelineCapabilities from '@/config/maritime/pipeline-capabilities.json';
import { createChatCompletion } from '@/lib/groq-chat';
import { parseJsonFromLlm } from '@/lib/parse-llm-json';
import { compilePattern } from '@/lib/tools/config-loader';
import type { AdaptivePipelinePlan } from './types';

interface CapabilityConfig {
  id: string;
  essential: boolean;
  triggers: string[];
  antiTriggers: string[];
  description: string;
}

const AGENT_EXECUTION_ORDER = [
  'requirement_analyzer',
  'tool_provisioner',
  'data_classifier',
  'visualization_selector',
  'bridgeview_intelligence',
  'layout_planner',
  'schema_builder',
  'react_generator',
  'ux_reviewer',
  'maritime_expert',
] as const;

function matchesPrd(text: string, triggers: string[], antiTriggers: string[]): boolean {
  if (antiTriggers.some((p) => compilePattern(p).test(text))) return false;
  if (triggers.length === 0) return true;
  return triggers.some((p) => compilePattern(p).test(text));
}

function selectCapabilities(
  prd: string,
  list: CapabilityConfig[],
  type: 'agent' | 'tool'
): { selected: string[]; skipped: AdaptivePipelinePlan['skipped'] } {
  const selected: string[] = [];
  const skipped: AdaptivePipelinePlan['skipped'] = [];

  for (const cap of list) {
    if (cap.essential || matchesPrd(prd, cap.triggers, cap.antiTriggers)) {
      selected.push(cap.id);
    } else {
      skipped.push({
        id: cap.id,
        type,
        reason: `Not required for this PRD — ${cap.description}`,
      });
    }
  }

  return { selected, skipped };
}

function ensureVisualizationPath(agents: string[]): string[] {
  const set = new Set(agents);
  if (!set.has('visualization_selector') && set.has('schema_builder')) {
    set.add('visualization_selector');
  }
  if (set.has('visualization_selector') && !set.has('data_classifier')) {
    set.add('data_classifier');
  }
  if (set.has('layout_planner') && !set.has('bridgeview_intelligence') && !set.has('visualization_selector')) {
    set.add('visualization_selector');
  }
  if (set.has('bridgeview_intelligence')) {
    set.add('visualization_selector');
    set.add('data_classifier');
  }
  return [...set];
}

function ensureToolConsistency(agents: string[], tools: string[]): string[] {
  const toolSet = new Set(tools);
  if (agents.includes('bridgeview_intelligence')) {
    toolSet.delete('feature_discovery');
  } else if (toolSet.has('feature_discovery')) {
    toolSet.add('map_widgets');
  }
  if (agents.includes('schema_builder') && !toolSet.has('recommend_visualizations')) {
    const prdNeedsViz = matchesPrd(
      agents.join(' '),
      pipelineCapabilities.tools.find((t) => t.id === 'recommend_visualizations')?.triggers ?? [],
      []
    );
    if (prdNeedsViz) toolSet.add('recommend_visualizations');
  }
  return [...toolSet];
}

export function planPipelineFromPrd(prd: string): AdaptivePipelinePlan {
  const agentCaps = pipelineCapabilities.agents as CapabilityConfig[];
  const toolCaps = pipelineCapabilities.tools as CapabilityConfig[];

  const agents = selectCapabilities(prd, agentCaps, 'agent');
  const tools = selectCapabilities(prd, toolCaps, 'tool');

  const mergedAgents = ensureVisualizationPath(agents.selected);
  const mergedTools = ensureToolConsistency(mergedAgents, tools.selected);

  const selectedAgentSet = new Set(mergedAgents);
  const skipped = [
    ...agents.skipped.filter((s) => !selectedAgentSet.has(s.id)),
    ...tools.skipped.filter((s) => !mergedTools.includes(s.id)),
  ];

  const rationale = buildRationale(mergedAgents, mergedTools, skipped);

  return {
    agents: topologicalSortAgents(mergedAgents),
    tools: mergedTools,
    skipped,
    rationale,
  };
}

export function refinePlanFromRequirements(
  plan: AdaptivePipelinePlan,
  requirements: RequirementAnalysis,
  prd: string
): AdaptivePipelinePlan {
  const rules = pipelineCapabilities.refinementRules;
  const text = `${prd}\n${requirements.domain}\n${requirements.metrics.map((m) => m.name).join(' ')}`;
  const agents = new Set(plan.agents);
  const tools = new Set(plan.tools);
  const skipped = [...plan.skipped];

  function addAgent(id: string, reason: string) {
    if (agents.has(id)) return;
    agents.add(id);
    const idx = skipped.findIndex((s) => s.id === id);
    if (idx >= 0) skipped.splice(idx, 1);
    plan.rationale += ` · Added ${id}: ${reason}`;
  }

  function removeAgent(id: string, reason: string) {
    if (!agents.has(id) || pipelineCapabilities.agents.find((a) => a.id === id)?.essential) return;
    agents.delete(id);
    skipped.push({ id, type: 'agent', reason });
  }

  if (requirements.metrics.length < rules.skipDataClassifierWhenMetricsBelow) {
    removeAgent('data_classifier', `Only ${requirements.metrics.length} metric(s) — lightweight path`);
  }

  if (requirements.metrics.length > rules.forceBridgeviewWhenMetricsAbove) {
    addAgent('bridgeview_intelligence', 'rich metric set');
  }

  if (requirements.priority === rules.forceMaritimeExpertWhenPriority) {
    addAgent('maritime_expert', 'safety-critical priority');
    addAgent('ux_reviewer', 'safety-critical priority');
  }

  if (matchesPrd(text, ['widget|dashboard|panel'], [])) {
    addAgent('visualization_selector', 'dashboard widgets implied');
  }

  addAgent('tool_provisioner', 'provision PRD-specific tools after requirements extracted');

  const mergedAgents = ensureVisualizationPath([...agents]);
  const mergedTools = ensureToolConsistency(mergedAgents, [...tools]);

  return {
    agents: topologicalSortAgents(mergedAgents),
    tools: mergedTools,
    skipped,
    rationale: plan.rationale,
  };
}

function topologicalSortAgents(agentIds: string[]): string[] {
  const set = new Set(agentIds);
  return AGENT_EXECUTION_ORDER.filter((id) => set.has(id));
}

function buildRationale(
  agents: string[],
  tools: string[],
  skipped: AdaptivePipelinePlan['skipped']
): string {
  return `Adaptive plan: ${agents.length} agents, ${tools.length} tools, ${skipped.length} skipped for this PRD profile`;
}

async function llmRefinePlan(prd: string, base: AdaptivePipelinePlan): Promise<AdaptivePipelinePlan> {
  const catalog = {
    agents: (pipelineCapabilities.agents as CapabilityConfig[]).map((a) => a.id),
    tools: (pipelineCapabilities.tools as CapabilityConfig[]).map((t) => t.id),
  };

  const { response } = await createChatCompletion(
    {
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You tailor a maritime UI pipeline to a PRD. Respond with ONLY a JSON object (no prose):
{ "agents": string[], "tools": string[], "skip": [{ "id": string, "reason": string }], "rationale": string }
Only use IDs from catalog: ${JSON.stringify(catalog)}
Essential agents (must keep): requirement_analyzer, schema_builder, react_generator
You may remove optional agents/tools not needed. You may add optional ones if PRD clearly needs them.`,
        },
        {
          role: 'user',
          content: `PRD:\n${prd.slice(0, 5000)}\n\nBaseline agents: ${base.agents.join(', ')}\nBaseline tools: ${base.tools.join(', ')}`,
        },
      ],
    },
    'PipelinePlanner'
  );

  const parsed = parseJsonFromLlm<{
    agents?: string[];
    tools?: string[];
    skip?: { id: string; reason: string }[];
    rationale?: string;
  }>(response.choices[0]?.message?.content ?? '');

  if (!parsed) {
    throw new Error('Pipeline planner LLM returned non-JSON response');
  }

  const essential = new Set(
    (pipelineCapabilities.agents as CapabilityConfig[]).filter((a) => a.essential).map((a) => a.id)
  );
  const validAgents = (parsed.agents ?? base.agents).filter(
    (id) => catalog.agents.includes(id) || essential.has(id)
  );
  for (const e of essential) {
    if (!validAgents.includes(e)) validAgents.unshift(e);
  }

  const validTools = (parsed.tools ?? base.tools).filter((id) => catalog.tools.includes(id));
  const skipped = [
    ...base.skipped,
    ...(parsed.skip ?? []).map((s) => ({
      id: s.id,
      type: (catalog.agents.includes(s.id) ? 'agent' : 'tool') as 'agent' | 'tool',
      reason: s.reason,
    })),
  ];

  return {
    agents: topologicalSortAgents(ensureVisualizationPath([...new Set(validAgents)])),
    tools: ensureToolConsistency(validAgents, [...new Set(validTools)]),
    skipped,
    rationale: parsed.rationale ?? base.rationale,
  };
}

export async function createAdaptivePlan(prd: string): Promise<AdaptivePipelinePlan> {
  const base = planPipelineFromPrd(prd);
  if (!process.env.GROQ_API_KEY || process.env.DISABLE_ADAPTIVE_LLM_PLANNER === 'true') {
    return base;
  }
  try {
    return await llmRefinePlan(prd, base);
  } catch (err) {
    console.warn('LLM pipeline planner unavailable — using config plan', err);
    return base;
  }
}
