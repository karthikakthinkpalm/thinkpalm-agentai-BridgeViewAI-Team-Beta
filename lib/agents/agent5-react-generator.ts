import { groq } from '../anthropic';
import { checkExists, registerComponent } from '../tools/registry';
import type { ParsedSchema } from '../types/pipeline';
import {
  buildAgent5SystemPrompt,
  buildAgent5UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';
import { getDesignSystemTemplate } from '../tools/widget-design-system';
import { buildFallbackComponent } from './fallback-components';
import { isLlmUnavailableError, isRateLimitError, withRetry } from './shared';

export interface Agent5Result {
  components: Record<string, string>;
  prompts: PromptRecord[];
  fallbackWidgets: string[];
  warnings: string[];
}

export async function runAgent5ReactGenerator(schema: ParsedSchema): Promise<Agent5Result> {
  const generated: Record<string, string> = {};
  const prompts: PromptRecord[] = [];
  const fallbackWidgets: string[] = [];
  const warnings: string[] = [];
  const systemPrompt = buildAgent5SystemPrompt();

  for (const widget of schema.widgets) {
    if (checkExists(widget.name)) continue;

    const placement = schema.layoutPlan?.placements.find((p) => p.widget === widget.name);
    const vizHints = widget.recommendations
      ?.map((r) => `${r.dataField}: use ${r.visualization} — ${r.reason}`)
      .join('\n');

    const archetype = widget.archetype ?? 'card';
    const designSystemTemplate = getDesignSystemTemplate(archetype);

    const userPrompt = buildAgent5UserPrompt(
      widget.name,
      widget.description,
      schema.domain,
      schema.layout,
      schema.priority,
      archetype,
      vizHints,
      placement ? `Layout zone: ${placement.zone} (row ${placement.row}) — ${placement.rationale}` : undefined,
      designSystemTemplate
    );

    prompts.push({
      id: `a5-system-${widget.name}`,
      agent: 'AGENT 5',
      role: 'system',
      label: `React Generator — ${widget.name} (System)`,
      content: systemPrompt,
      techniques: ['Production TSX', 'Design system injection', 'CardShell wrapper'],
    });
    prompts.push({
      id: `a5-design-${widget.name}`,
      agent: 'AGENT 5',
      role: 'system',
      label: `Design System — ${archetype}`,
      content: designSystemTemplate,
      techniques: ['Archetype template pre-fetch'],
    });
    prompts.push({
      id: `a5-user-${widget.name}`,
      agent: 'AGENT 5',
      role: 'user',
      label: `React Generator — ${widget.name} (User)`,
      content: userPrompt,
      techniques: ['Layout context', 'Visualization hints', 'Archetype grounding'],
    });

    try {
      const response = await withRetry(
        () =>
          groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        3,
        'Agent 5'
      );

      const code = response.choices[0]?.message?.content || '';
      const clean = code.replace(/```(?:typescript|tsx|ts|jsx)?|```/g, '').trim();
      if (!clean) throw new Error('Empty LLM response');
      registerComponent(widget.name, clean);
      generated[widget.name] = clean;
      console.log(`Agent 5 generated: ${widget.name}`);
    } catch (err) {
      if (!isLlmUnavailableError(err)) throw err;

      const reason = isRateLimitError(err) ? 'Groq rate limit' : 'LLM unavailable';
      const code = buildFallbackComponent(
        widget.name,
        widget.description,
        widget.archetype ?? 'card',
        schema.domain
      );
      registerComponent(widget.name, code);
      generated[widget.name] = code;
      fallbackWidgets.push(widget.name);
      warnings.push(
        `${widget.name}: ${reason} — exported curated maritime template (Live Preview unchanged)`
      );
      console.warn(`Agent 5 fallback for ${widget.name} (${reason})`);
    }
  }

  return { components: generated, prompts, fallbackWidgets, warnings };
}
