import { groq } from '../anthropic';
import { getGeminiClient } from '../gemini';
import { LLMProvider, LLM_CONFIG } from '../config/llm-config';
import { checkExists, registerComponent } from '../tools/registry';
import { ParsedSchema } from './agent1-parser';
import {
  buildAgent2SystemPrompt,
  buildAgent2UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';
import { getDesignSystemTemplate } from '../tools/widget-design-system';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err.status === 429 || err.status === 503 || (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('Rate limit') || err.message.includes('high demand') || err.message.includes('quota')));
      if (isRetryable && attempt < maxRetries - 1) {
        attempt++;
        const waitTime = attempt * 15000;
        console.warn(`API Busy (429/503) Agent 2. Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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

export async function runAgent2(schema: ParsedSchema, provider: LLMProvider = 'groq'): Promise<Agent2Result> {
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

    let code = '';

    if (provider === 'gemini') {
      const gemini = getGeminiClient();
      let response = await withRetry(() => gemini.models.generateContent({
        model: LLM_CONFIG.gemini.model,
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
        ],
        config: {
          temperature: 0.7,
        }
      }));

      code = response.text || '';

    } else {
      let response = await withRetry(() => groq.chat.completions.create({
        model: LLM_CONFIG.groq.model,
        temperature: 0.7,
        messages,
      }));

      code = response.choices[0]?.message?.content || '';
    }
    const clean = code.replace(/```(?:typescript|tsx|ts|jsx)?|```/g, '').trim();

    registerComponent(widget.name, clean);
    generated[widget.name] = clean;
    console.log(`Generated: ${widget.name}`);
  }

  return { components: generated, prompts };
}
