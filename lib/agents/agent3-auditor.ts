import { groq } from '../anthropic';
import { getGeminiClient } from '../gemini';
import { LLMProvider, LLM_CONFIG } from '../config/llm-config';
import { Agent2Result } from './agent2-builder';

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
        console.warn(`API Busy (429/503) Agent 3. Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export interface Agent3Result {
  score: number;
  compliance: string;
  accessibility: string;
  suggestions: string[];
}

export async function runAgent3(agent2Result: Agent2Result, provider: LLMProvider = 'groq'): Promise<{ result: Agent3Result, prompt: any }> {
  const systemPrompt = `You are a strict Maritime UI Quality Assurance Auditor.
Your job is to read the generated React TSX code for a dashboard and provide a JSON Report Card.

RULES:
- Evaluate the code for "Night-vision contrast readiness" (are dark modes and opacities used well?).
- Evaluate for "Accessibility" (are fonts readable, are layouts clean?).
- Return ONLY valid JSON in this exact format:
{
  "score": 95,
  "compliance": "A brief sentence about night-vision/color compliance.",
  "accessibility": "A brief sentence about layout and readability.",
  "suggestions": [
    "A specific improvement suggestion",
    "Another specific suggestion"
  ]
}`;

  // We only send a summary/snippet of the code to save tokens, since sending ALL code might be too large.
  // Actually, we can send the list of components and a sample, or all if it fits. Let's send a concatenated string.
  const allCode = Object.entries(agent2Result.components)
    .map(([name, code]) => `--- ${name}.tsx ---\n${code.substring(0, 500)}... (truncated)`)
    .join('\n\n');

  const userPrompt = `Audit the following generated dashboard components:\n\n${allCode}`;

  let jsonStr = '';

  if (provider === 'gemini') {
    const gemini = getGeminiClient();
    const response = await withRetry(() => gemini.models.generateContent({
      model: LLM_CONFIG.gemini.model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
      ],
      config: {
        temperature: 0.3,
      }
    }));
    jsonStr = response.text || '{}';
  } else {
    const response = await withRetry(() => groq.chat.completions.create({
      model: LLM_CONFIG.groq.model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    }));
    jsonStr = response.choices[0]?.message?.content || '{}';
  }

  const clean = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
  let result: Agent3Result = { score: 0, compliance: 'N/A', accessibility: 'N/A', suggestions: [] };
  try {
    result = JSON.parse(clean);
  } catch (e) {
    console.error('Agent 3 parse error:', e);
  }

  const promptRecord = {
    id: 'a3-auditor',
    agent: 'AGENT 3',
    role: 'system',
    label: 'QA Auditor',
    content: systemPrompt,
    techniques: ['Structured output', 'Code Auditing'],
  };

  return { result, prompt: promptRecord };
}
