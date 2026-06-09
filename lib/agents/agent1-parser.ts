import { groq } from '../anthropic';
import { getGeminiClient } from '../gemini';
import { LLMProvider, LLM_CONFIG } from '../config/llm-config';
import { mapWidgets, normalizeWidgetList, ALL_MARITIME_WIDGETS } from '../tools/widget-mapper';
import {
  buildAgent1SystemPrompt,
  buildAgent1UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';

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
        console.warn(`API Busy (429/503) Agent 1. Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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

export async function runAgent1(prd: string, provider: LLMProvider = 'groq'): Promise<Agent1Result> {
  const detectedWidgets = mapWidgets(prd);

  const systemPrompt = buildAgent1SystemPrompt();
  const userPrompt = buildAgent1UserPrompt(prd, detectedWidgets);

  let clean = '';

  if (provider === 'gemini') {
    const gemini = getGeminiClient();
    const response = await withRetry(() => gemini.models.generateContent({
      model: LLM_CONFIG.gemini.model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    }));
    clean = response.text || '';
  } else {
    const response = await withRetry(() => groq.chat.completions.create({
      model: LLM_CONFIG.groq.model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }));

    const raw = response.choices[0]?.message?.content || '';
    clean = raw.replace(/```json|```/g, '').trim();
  }

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
