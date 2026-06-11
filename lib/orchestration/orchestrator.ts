import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { createChatCompletion } from '@/lib/llm-router';
import { buildWidgetHierarchy } from '@/lib/preview/hierarchy';
import { clearRegistry, injectComponents } from '@/lib/tools/registry';
import type { PipelineResult } from '@/lib/types/pipeline';
import {
  applyReviewStubs,
  applyStubsForContext,
  recordSkippedCapabilities,
} from './capability-stubs';
import { bootstrapOrchestration } from './bootstrap';
import { createAdaptivePlan, refinePlanFromRequirements } from './pipeline-planner';
import {
  canFinalizePipeline,
  canRunAgent,
  clearDynamicTools,
  contextHasRequirement,
  createInitialContext,
  getAgent,
  getAllAgents,
  getEligibleAgents,
  getGroqTools,
  getPlannedFinalizeRequirements,
  getTool,
  isPlannedAgent,
  isPlannedTool,
} from './registry';
import type { PipelineContext } from './types';

const MAX_ORCHESTRATION_STEPS = 24;

function buildOrchestratorSystemPrompt(ctx: PipelineContext): string {
  const eligible = getEligibleAgents(ctx).map((a) => `- ${a.id}: ${a.description}`);
  const completed = [...ctx.completedCapabilities];
  const plan = ctx.plan;

  return `You are the BridgeView AI adaptive pipeline orchestrator. The pipeline was tailored to this PRD — only invoke planned capabilities.

Adaptive plan rationale: ${plan?.rationale ?? 'default'}
Planned agents: ${plan?.agents.join(', ') ?? 'all'}
Planned tools: ${plan?.tools.join(', ') ?? 'all'}
Provisioned tools: ${plan?.provisionedTools?.map((t) => t.id).join(', ') || 'none'}
Skipped (do NOT call): ${plan?.skipped.map((s) => s.id).join(', ') || 'none'}

Rules:
1. Only call capabilities in the plan — never skipped ones.
2. Respect dependencies — stubs may have pre-filled context for skipped upstream steps.
3. Call recommend_visualizations before schema_builder when it is in the plan.
4. finalize_pipeline when all planned agents/tools are done and schema + components exist.
5. Use get_pipeline_status when unsure.

Completed: ${completed.length ? completed.join(', ') : 'none'}
Eligible next:
${eligible.length ? eligible.join('\n') : 'none'}`;
}

function pipelineStatus(ctx: PipelineContext): Record<string, unknown> {
  return {
    plan: ctx.plan,
    completed: [...ctx.completedCapabilities],
    eligibleAgents: getEligibleAgents(ctx).map((a) => a.id),
    eligibleTools: (ctx.plan?.tools ?? []).filter((id) => !ctx.completedCapabilities.has(id)),
    canFinalize: canFinalizePipeline(ctx),
    hasSchema: Boolean(ctx.schema),
    hasComponents: Boolean(ctx.components && Object.keys(ctx.components).length > 0),
    agents: getAllAgents().map((a) => ({
      id: a.id,
      planned: isPlannedAgent(ctx, a.id),
      completed: ctx.completedCapabilities.has(a.id),
      canRun: canRunAgent(a, ctx),
    })),
  };
}

async function executeCapability(
  name: string,
  args: Record<string, unknown>,
  ctx: PipelineContext
): Promise<string> {
  if (name === 'get_pipeline_status') {
    return JSON.stringify(pipelineStatus(ctx));
  }

  if (name === 'finalize_pipeline') {
    if (!canFinalizePipeline(ctx)) {
      const missing = getPlannedFinalizeRequirements(ctx).filter(
        (id) => !ctx.completedCapabilities.has(id)
      );
      return JSON.stringify({ error: 'Cannot finalize — planned steps incomplete', missing });
    }
    applyReviewStubs(ctx);
    recordSkippedCapabilities(ctx);
    ctx.finalized = true;
    return JSON.stringify({ success: true, message: 'Adaptive pipeline finalized' });
  }

  const agent = getAgent(name);
  if (agent) {
    if (!isPlannedAgent(ctx, agent.id)) {
      return JSON.stringify({ error: `${name} not in adaptive plan for this PRD` });
    }
    if (!canRunAgent(agent, ctx)) {
      applyStubsForContext(ctx);
      if (!canRunAgent(agent, ctx)) {
        return JSON.stringify({
          error: 'Agent dependencies not satisfied',
          requires: agent.requires,
          completed: [...ctx.completedCapabilities],
        });
      }
    }

    console.log(`Orchestrator invoking agent: ${agent.displayName} (${agent.id})`);
    const result = await agent.run(ctx);
    ctx.completedCapabilities.add(agent.id);

    if (agent.id === 'requirement_analyzer' && ctx.requirements && ctx.plan) {
      ctx.plan = refinePlanFromRequirements(ctx.plan, ctx.requirements, ctx.prd);
      ctx.agentTrace.push({
        agent: 'ADAPTIVE PLAN',
        status: 'refined',
        detail: `Re-planned: ${ctx.plan.agents.length} agents, ${ctx.plan.skipped.length} skipped`,
      });
    }

    ctx.agentTrace.push({
      agent: agent.displayName,
      status: result.status ?? 'done',
      detail: result.summary,
    });
    return JSON.stringify({ success: true, agent: agent.id, summary: result.summary });
  }

  const tool = getTool(name);
  if (tool) {
    if (!isPlannedTool(ctx, tool.id)) {
      return JSON.stringify({ error: `${name} not in adaptive tool plan for this PRD` });
    }
    console.log(`Orchestrator invoking tool: ${tool.id}`);
    const result = await tool.run(args, ctx);
    ctx.completedCapabilities.add(tool.id);
    return JSON.stringify({ success: true, tool: tool.id, result });
  }

  return JSON.stringify({ error: `Unknown capability: ${name}` });
}

/** Run only the PRD-tailored plan (deterministic order). */
function buildAdaptiveExecutionOrder(ctx: PipelineContext): string[] {
  const agents = ctx.plan?.agents ?? [];
  const tools = ctx.plan?.tools ?? [];
  const schemaIdx = agents.indexOf('schema_builder');
  if (schemaIdx < 0) return [...agents, ...tools];
  return [...agents.slice(0, schemaIdx), ...tools, ...agents.slice(schemaIdx)];
}

async function runAdaptiveSequence(ctx: PipelineContext): Promise<void> {
  const order = buildAdaptiveExecutionOrder(ctx);

  for (const step of order) {
    if (ctx.completedCapabilities.has(step)) continue;

    const agent = getAgent(step);
    if (agent && isPlannedAgent(ctx, step)) {
      applyStubsForContext(ctx);
      if (canRunAgent(agent, ctx)) {
        await executeCapability(step, {}, ctx);
      }
      continue;
    }

    if (isPlannedTool(ctx, step)) {
      const args = step === 'recommend_visualizations' ? { prd: ctx.prd } : {};
      await executeCapability(step, args, ctx);
    }
  }

  applyStubsForContext(ctx);
  applyReviewStubs(ctx);
  recordSkippedCapabilities(ctx);

  if (canFinalizePipeline(ctx)) {
    ctx.finalized = true;
  }
}

async function orchestrationLoop(ctx: PipelineContext): Promise<void> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildOrchestratorSystemPrompt(ctx) },
    {
      role: 'user',
      content: `Execute the adaptive pipeline for this PRD (${ctx.prd.length} chars). Plan: ${ctx.plan?.agents.join(' → ')}. Start with requirement_analyzer if planned.`,
    },
  ];

  let orchestratorModel: string | null = null;

  for (let step = 0; step < MAX_ORCHESTRATION_STEPS && !ctx.finalized; step++) {
    const tools = getGroqTools(ctx);

    if (tools.length <= 2) {
      break;
    }

    let choice;
    try {
      const { response, model } = await createChatCompletion(
        {
          temperature: 0.1,
          messages,
          tools,
          tool_choice: 'required',
        },
        'Orchestrator',
        { preferredModel: orchestratorModel, provider: ctx.llmProvider }
      );
      orchestratorModel = model;
      choice = response.choices[0]?.message;
    } catch {
      console.warn('Orchestrator: all models unavailable — using adaptive deterministic sequence');
      await runAdaptiveSequence(ctx);
      return;
    }

    if (!choice) break;

    const toolCalls = choice.tool_calls;
    if (!toolCalls?.length) {
      messages.push({ role: 'assistant', content: choice.content ?? 'No tool selected.' });
      break;
    }

    messages.push({
      role: 'assistant',
      content: choice.content ?? null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const fn = call.function;
      let args: Record<string, unknown> = {};
      try {
        args = fn.arguments ? (JSON.parse(fn.arguments) as Record<string, unknown>) : {};
      } catch {
        args = {};
      }

      const result = await executeCapability(fn.name, args, ctx);
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });

      if (fn.name === 'finalize_pipeline' && ctx.finalized) {
        return;
      }
    }

    messages[0] = { role: 'system', content: buildOrchestratorSystemPrompt(ctx) };
  }

  if (!ctx.finalized) {
    console.warn('Orchestrator loop ended without finalize — running adaptive sequence');
    await runAdaptiveSequence(ctx);
  }
}

function assertPipelineComplete(ctx: PipelineContext): void {
  if (!ctx.schema || !ctx.components) {
    throw new Error('Pipeline missing required outputs (schema or components)');
  }
  applyReviewStubs(ctx);
}

export async function runOrchestratedPipeline(
  prd: string,
  existingComponents?: Record<string, string>,
  llmProvider?: 'groq' | 'gemini'
): Promise<
  PipelineResult & {
    hierarchy: ReturnType<typeof buildWidgetHierarchy>;
    adaptivePlan?: PipelineContext['plan'];
  }
> {
  bootstrapOrchestration();
  clearDynamicTools();
  if (existingComponents) {
    injectComponents(existingComponents);
  } else {
    clearRegistry();
  }

  const ctx = createInitialContext(prd);
  ctx.llmProvider = llmProvider;
  ctx.plan = await createAdaptivePlan(prd, llmProvider);

  ctx.agentTrace.push({
    agent: 'ADAPTIVE PLAN',
    status: 'planned',
    detail: `${ctx.plan.agents.length} agents · ${ctx.plan.tools.length} tools · ${ctx.plan.skipped.length} skipped — ${ctx.plan.rationale}`,
  });

  await orchestrationLoop(ctx);

  if (!ctx.finalized) {
    await runAdaptiveSequence(ctx);
  }

  assertPipelineComplete(ctx);

  const hierarchy = buildWidgetHierarchy(ctx.schema!);
  const tree = Object.keys(ctx.components!);

  return {
    schema: ctx.schema!,
    components: ctx.components!,
    tree,
    hierarchy,
    prompts: ctx.prompts,
    detectedWidgets: ctx.detectedWidgets ?? [],
    visualizationAnalysis: ctx.visualizationAnalysis,
    featureDiscovery: ctx.discovery,
    uxReview: ctx.uxReview!,
    maritimeReview: ctx.maritimeReview!,
    agentTrace: ctx.agentTrace,
    warnings: ctx.warnings,
    adaptivePlan: ctx.plan,
    provisionedTools: ctx.provisionedTools ?? ctx.plan?.provisionedTools ?? [],
  };
}

export { contextHasRequirement, getEligibleAgents, pipelineStatus };
