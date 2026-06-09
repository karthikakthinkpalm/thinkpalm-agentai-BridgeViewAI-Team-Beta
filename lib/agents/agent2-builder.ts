import { groq } from '../anthropic';
import { checkExists, registerComponent } from '../tools/registry';
import { ParsedSchema } from './agent1-parser';
import {
  buildAgent2SystemPrompt,
  buildAgent2UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';
import { UI_ARCHETYPES } from '../prompts/archetypes';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('Rate limit')));
      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        console.warn(`Rate limited (429). Retrying in ${attempt * 5} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export interface Agent2Result {
  components: Record<string, string>;
  prompts: PromptRecord[];
}

export async function runAgent2(schema: ParsedSchema): Promise<Agent2Result> {
  const generated: Record<string, string> = {};
  const prompts: PromptRecord[] = [];
  const systemPrompt = buildAgent2SystemPrompt();

  for (const widget of schema.widgets) {
    if (checkExists(widget.name)) {
      console.log(`Skipping ${widget.name} — already in registry`);
      continue;
    }

    const userPrompt = buildAgent2UserPrompt(
      widget.name,
      widget.description,
      schema.domain,
      schema.layout,
      schema.priority
    );

    prompts.push({
      id: `a2-system-${widget.name}`,
      agent: 'AGENT 2',
      role: 'system',
      label: `UI Builder — ${widget.name} (System)`,
      content: systemPrompt,
      techniques: ['Role assignment', 'Negative constraints', 'Output format'],
    });
    prompts.push({
      id: `a2-user-${widget.name}`,
      agent: 'AGENT 2',
      role: 'user',
      label: `UI Builder — ${widget.name} (User)`,
      content: userPrompt,
      techniques: ['Domain context', 'Widget-specific few-shot hints'],
    });

    // Step 1: Ask the LLM to pick an archetype
    const archetypePrompt = [
      { role: 'system', content: 'You are an UI architect. Choose the best visual archetype for the requested maritime widget. You MUST output ONLY ONE word from this exact list: Table, KPIGrid, RadialChart, LineChart. Do not output anything else.' },
      { role: 'user', content: `Widget Name: ${widget.name}\nDescription: ${widget.description}` }
    ];

    let archetypeResponse = await withRetry(() => groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      messages: archetypePrompt,
    }));

    const chosenArchetype = archetypeResponse.choices[0]?.message?.content?.trim() || 'KPIGrid';
    // Validate it's a known archetype
    const validArchetype = UI_ARCHETYPES[chosenArchetype] ? chosenArchetype : 'KPIGrid';
    const template = UI_ARCHETYPES[validArchetype];

    prompts.push({
      id: `a2-archetype-${widget.name}`,
      agent: 'AGENT 2',
      role: 'system',
      label: `Archetype Selected: ${validArchetype}`,
      content: template,
      techniques: ['Archetype Template Injection'],
    });

    // Step 2: Ask the LLM to build the final component using the template
    const finalSystemPrompt = systemPrompt + `\n\nCRITICAL INSTRUCTIONS FOR TEMPLATE INJECTION:
1. You MUST use the following TSX template as your exact structural baseline.
2. DO NOT change the function declaration line (e.g., keep it as \`export default function GenericTableWidget() {\`). We will handle renaming dynamically. DO NOT rename the component!
3. DO NOT change the layout structure, Tailwind classes, or Recharts configurations.
4. ONLY modify the variable names, title strings, and inject the mock maritime data.
5. EXTREMELY CRITICAL: Check your TSX syntax carefully! Ensure all JSON objects have correct commas, all JSX tags are closed correctly, and no parenthesis are missing. Do not break the template's syntax!

### BASELINE TEMPLATE ###
${template}`;
    
    const messages: any[] = [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let response = await withRetry(() => groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      messages,
    }));

    const code = response.choices[0]?.message?.content || '';
    const clean = code.replace(/```(?:typescript|tsx|ts|jsx)?|```/g, '').trim();

    registerComponent(widget.name, clean);
    generated[widget.name] = clean;
    console.log(`Generated: ${widget.name}`);
  }

  return { components: generated, prompts };
}
