import { groq } from '../anthropic';
import { checkExists, registerComponent } from '../tools/registry';
import { ParsedSchema } from './agent1-parser';
import {
  buildAgent2SystemPrompt,
  buildAgent2UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';
import { getDesignSystemTemplate } from '../tools/widget-design-system';

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

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_design_system_template',
          description: 'Get structural JSON exemplars and Tailwind class guidelines for a specific widget archetype.',
          parameters: {
            type: 'object',
            properties: {
              widgetType: {
                type: 'string',
                enum: ['table', 'kpi', 'alert', 'card', 'list'],
                description: 'The archetype of the widget to get structural design rules for.'
              }
            },
            required: ['widgetType']
          }
        }
      }
    ];

    let response = await withRetry(() => groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      messages,
      tools,
      tool_choice: 'auto'
    }));

    const responseMessage = response.choices[0]?.message;

    if (responseMessage?.tool_calls) {
      messages.push(responseMessage);
      
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === 'get_design_system_template') {
          const args = JSON.parse(toolCall.function.arguments);
          const toolResult = getDesignSystemTemplate(args.widgetType);
          
          prompts.push({
            id: `a2-tool-${widget.name}-${toolCall.id}`,
            agent: 'AGENT 2',
            role: 'system',
            label: `Tool Call — get_design_system_template('${args.widgetType}')`,
            content: toolResult,
            techniques: ['Tool execution', 'Structured JSON output'],
          });

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: toolResult,
          });
        }
      }

      // Second call to get final component code
      response = await withRetry(() => groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        messages,
      }));
    }

    const code = response.choices[0]?.message?.content || '';
    const clean = code.replace(/```(?:typescript|tsx|ts|jsx)?|```/g, '').trim();

    registerComponent(widget.name, clean);
    generated[widget.name] = clean;
    console.log(`Generated: ${widget.name}`);
  }

  return { components: generated, prompts };
}
