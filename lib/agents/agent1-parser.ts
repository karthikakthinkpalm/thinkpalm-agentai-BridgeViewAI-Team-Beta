import { groq } from '../anthropic';
import { mapWidgets, normalizeWidgetList, ALL_MARITIME_WIDGETS } from '../tools/widget-mapper';
import {
  buildAgent1SystemPrompt,
  buildAgent1UserPrompt,
  type PromptRecord,
} from '../prompts/maritime-prompts';

export interface ParsedSchema {
  domain: string;
  widgets: string[];
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
  const allowedWidgets = [...ALL_MARITIME_WIDGETS];

  const systemPrompt = buildAgent1SystemPrompt(allowedWidgets);
  const userPrompt = buildAgent1UserPrompt(prd, detectedWidgets);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content || '';
  const clean = raw.replace(/```json|```/g, '').trim();

  const parsed = JSON.parse(clean) as ParsedSchema;
  const schema: ParsedSchema = {
    ...parsed,
    widgets: normalizeWidgetList(parsed.widgets?.length ? parsed.widgets : detectedWidgets),
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
