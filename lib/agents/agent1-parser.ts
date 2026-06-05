import { groq } from '../anthropic';
import { mapWidgets, normalizeWidgetList, ALL_MARITIME_WIDGETS } from '../tools/widget-mapper';
import {
  buildAgent1SystemPrompt,
  buildAgent1UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('Rate limit')));
      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        console.warn(`Rate limited (429) Agent 1. Retrying in ${attempt * 5} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export interface WidgetDefinition {
  name: string;
  description: string;
}

export interface ParsedSchema {
  domain: string;
  widgets: WidgetDefinition[];
  layout: string;
  priority: string;
}

export interface Agent1Result {
  schema: ParsedSchema;
  detectedWidgets: string[];
  prompts: PromptRecord[];
}

export async function runAgent1(prd: string): Promise<Agent1Result> {
  const detectedWidgets = mapWidgets(prd);

  const systemPrompt = buildAgent1SystemPrompt();
  const userPrompt = buildAgent1UserPrompt(prd, detectedWidgets);

  const response = await withRetry(() => groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }));

  const raw = response.choices[0]?.message?.content || '';
  const clean = raw.replace(/```json|```/g, '').trim();

  const parsed = JSON.parse(clean) as ParsedSchema;
  
  // Ensure we have valid widget definitions
  const validWidgets = parsed.widgets && Array.isArray(parsed.widgets) 
    ? parsed.widgets 
    : detectedWidgets.map(w => ({ name: w, description: `Build a ${w} dashboard widget for maritime operations.` }));

  const schema: ParsedSchema = {
    ...parsed,
    widgets: validWidgets,
  };

  const prompts: PromptRecord[] = [
    {
      id: 'a1-system',
      agent: 'AGENT 1',
      role: 'system',
      label: 'PRD Parser — System',
      content: systemPrompt,
      techniques: ['Role assignment', 'Format constraint', 'Few-shot structure', 'Tool grounding'],
    },
    {
      id: 'a1-user',
      agent: 'AGENT 1',
      role: 'user',
      label: 'PRD Parser — User',
      content: userPrompt,
      techniques: ['Domain context', 'Widget mapper grounding'],
    },
  ];

  return { schema, detectedWidgets, prompts };
}
