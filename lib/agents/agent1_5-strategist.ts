import { groq } from '../anthropic';
import { getGeminiClient } from '../gemini';
import { LLMProvider, LLM_CONFIG } from '../config/llm-config';
import { ParsedSchema } from './agent1-parser';

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
        console.warn(`API Busy (429/503) Agent 1.5. Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export interface Agent1_5Result {
  theme: string;
  gridSpans: Record<string, string>;
}

export async function runAgent1_5(schema: ParsedSchema, provider: LLMProvider = 'groq'): Promise<{ result: Agent1_5Result, prompt: any }> {
  const systemPrompt = `You are a Senior UI/UX Layout Strategist for Maritime Dashboards.
Your job is to read a list of widgets and assign Tailwind CSS grid classes (col-span-X, row-span-Y) to each widget to create a beautiful, balanced bento-box style layout.
The main grid is 4 columns wide (md:grid-cols-4).

RULES:
- Very important widgets (like a map or main table) should be "md:col-span-4" or "md:col-span-2 md:row-span-2".
- KPIs should usually be "md:col-span-1" or "md:col-span-2".
- Assign a maritime theme name (e.g. "Deep Ocean", "Radar Green", "Arctic Ice").
- Return ONLY valid JSON in this exact format:
{
  "theme": "String",
  "gridSpans": {
    "WidgetName": "md:col-span-2 md:row-span-1"
  }
}`;

  const userPrompt = `Assign grid spans and a theme for these widgets:
${JSON.stringify(schema.widgets.map(w => ({ name: w.name, description: w.description })), null, 2)}`;

  let jsonStr = '';

  if (provider === 'gemini') {
    const gemini = getGeminiClient();
    const response = await withRetry(() => gemini.models.generateContent({
      model: LLM_CONFIG.gemini.model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
      ],
      config: {
        temperature: 0.2,
      }
    }));
    jsonStr = response.text || '{}';
  } else {
    const response = await withRetry(() => groq.chat.completions.create({
      model: LLM_CONFIG.groq.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    }));
    jsonStr = response.choices[0]?.message?.content || '{}';
  }

  const clean = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
  let result: Agent1_5Result = { theme: 'Default', gridSpans: {} };
  try {
    result = JSON.parse(clean);
  } catch (e) {
    console.error('Agent 1.5 parse error:', e);
  }

  const promptRecord = {
    id: 'a1_5-strategist',
    agent: 'AGENT 1.5',
    role: 'system',
    label: 'Layout Strategist',
    content: systemPrompt,
    techniques: ['Structured output', 'Design constraints'],
  };

  return { result, prompt: promptRecord };
}
