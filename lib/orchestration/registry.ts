import type { AgentDefinition, GroqTool, PipelineContext, ToolDefinition } from './types';

const agents = new Map<string, AgentDefinition>();
const tools = new Map<string, ToolDefinition>();
const dynamicToolIds = new Set<string>();

export function registerAgent(def: AgentDefinition): void {
  agents.set(def.id, def);
}

export function registerTool(def: ToolDefinition): void {
  tools.set(def.id, def);
}

export function registerDynamicTool(def: ToolDefinition): void {
  tools.set(def.id, def);
  dynamicToolIds.add(def.id);
}

export function clearDynamicTools(): void {
  for (const id of dynamicToolIds) {
    tools.delete(id);
  }
  dynamicToolIds.clear();
}

export function getAgent(id: string): AgentDefinition | undefined {
  return agents.get(id);
}

export function getTool(id: string): ToolDefinition | undefined {
  return tools.get(id);
}

export function getAllAgents(): AgentDefinition[] {
  return [...agents.values()];
}

export function getAllTools(): ToolDefinition[] {
  return [...tools.values()];
}

export function isPlannedAgent(ctx: PipelineContext, id: string): boolean {
  return ctx.plan?.agents.includes(id) ?? true;
}

export function isPlannedTool(ctx: PipelineContext, id: string): boolean {
  return ctx.plan?.tools.includes(id) ?? true;
}

export function isSkippedCapability(ctx: PipelineContext, id: string): boolean {
  return ctx.plan?.skipped.some((s) => s.id === id) ?? false;
}

export function contextHasRequirement(ctx: PipelineContext, key: string): boolean {
  switch (key) {
    case 'prd':
      return Boolean(ctx.prd?.trim());
    case 'requirements':
      return Boolean(ctx.requirements);
    case 'classifiedMetrics':
      return Boolean(ctx.classifiedMetrics?.length);
    case 'selectedWidgets':
      return Boolean(ctx.selectedWidgets?.length);
    case 'enrichedWidgets':
      return Boolean(ctx.enrichedWidgets?.length);
    case 'layoutPlan':
      return Boolean(ctx.layoutPlan);
    case 'visualizationAnalysis':
      return Boolean(ctx.visualizationAnalysis);
    case 'schema':
      return Boolean(ctx.schema);
    case 'components':
      return Boolean(ctx.components && Object.keys(ctx.components).length > 0);
    default:
      return false;
  }
}

export function canRunAgent(agent: AgentDefinition, ctx: PipelineContext): boolean {
  if (!isPlannedAgent(ctx, agent.id)) return false;
  if (isSkippedCapability(ctx, agent.id)) return false;
  if (ctx.completedCapabilities.has(agent.id)) return false;
  return agent.requires.every((req) => contextHasRequirement(ctx, req));
}

export function getEligibleAgents(ctx: PipelineContext): AgentDefinition[] {
  return getAllAgents().filter((a) => canRunAgent(a, ctx));
}

export function getPlannedFinalizeRequirements(ctx: PipelineContext): string[] {
  if (!ctx.plan) return getAllAgents().map((a) => a.id);
  return ctx.plan.agents.filter((id) => !isSkippedCapability(ctx, id));
}

export function canFinalizePipeline(ctx: PipelineContext): boolean {
  const required = getPlannedFinalizeRequirements(ctx);
  const agentsDone = required.every((id) => ctx.completedCapabilities.has(id));
  const toolsDone =
    ctx.plan?.tools.every((id) => ctx.completedCapabilities.has(id)) ?? true;
  return agentsDone && toolsDone && Boolean(ctx.schema) && Boolean(ctx.components);
}

export function getGroqTools(ctx: PipelineContext): GroqTool[] {
  const eligible = new Set(getEligibleAgents(ctx).map((a) => a.id));

  const agentTools: GroqTool[] = getAllAgents()
    .filter((a) => eligible.has(a.id) && isPlannedAgent(ctx, a.id))
    .map((a) => ({
      type: 'function' as const,
      function: {
        name: a.id,
        description: `${a.description} (produces: ${a.produces.join(', ')})`,
        parameters: { type: 'object', properties: {}, required: [] },
      },
    }));

  const toolDefs: GroqTool[] = getAllTools()
    .filter((t) => isPlannedTool(ctx, t.id) && !ctx.completedCapabilities.has(t.id))
    .map((t) => ({
      type: 'function' as const,
      function: {
        name: t.id,
        description: t.description,
        parameters: t.parameters,
      },
    }));

  const statusTool: GroqTool = {
    type: 'function',
    function: {
      name: 'get_pipeline_status',
      description: 'Returns adaptive plan, completed steps, and eligible next capabilities.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  };

  const finalizeTool: GroqTool = {
    type: 'function',
    function: {
      name: 'finalize_pipeline',
      description:
        'Mark the pipeline complete after all planned agents/tools have run and schema + components exist.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  };

  return [...agentTools, ...toolDefs, statusTool, finalizeTool];
}

export function createInitialContext(prd: string): PipelineContext {
  return {
    prd,
    fallbackWidgets: [],
    autoExpandedWidgets: [],
    prompts: [],
    agentTrace: [],
    warnings: [],
    completedCapabilities: new Set(),
    finalized: false,
  };
}
