import { groq } from '../anthropic';
import { checkExists, registerComponent } from '../tools/registry';
import { ParsedSchema } from './agent1-parser';
import {
  buildAgent2SystemPrompt,
  buildAgent2UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';

export interface Agent2Result {
  components: Record<string, string>;
  prompts: PromptRecord[];
}

export async function runAgent2(schema: ParsedSchema): Promise<Agent2Result> {
  const generated: Record<string, string> = {};
  const prompts: PromptRecord[] = [];
  const systemPrompt = buildAgent2SystemPrompt();

  for (const widget of schema.widgets) {
    if (checkExists(widget)) {
      console.log(`Skipping ${widget} — already in registry`);
      continue;
    }

    const userPrompt = buildAgent2UserPrompt(
      widget,
      schema.domain,
      schema.layout,
      schema.priority
    );

    prompts.push({
      id: `a2-system-${widget}`,
      agent: 'AGENT 2',
      role: 'system',
      label: `UI Builder — ${widget} (System)`,
      content: systemPrompt,
      techniques: ['Role assignment', 'Negative constraints', 'Output format'],
    });
    prompts.push({
      id: `a2-user-${widget}`,
      agent: 'AGENT 2',
      role: 'user',
      label: `UI Builder — ${widget} (User)`,
      content: userPrompt,
      techniques: ['Domain context', 'Widget-specific few-shot hints'],
    });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const code = response.choices[0]?.message?.content || '';
    const clean = code.replace(/```tsx|```ts|```jsx|```/g, '').trim();

    registerComponent(widget, clean);
    generated[widget] = clean;
    console.log(`Generated: ${widget}`);
  }

  return { components: generated, prompts };
}
