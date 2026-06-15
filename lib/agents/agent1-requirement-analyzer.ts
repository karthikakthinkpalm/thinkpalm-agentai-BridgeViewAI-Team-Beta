import { createChatCompletion } from '@/lib/llm-router';
import { mapWidgetsAsync } from '../tools/widget-mapper.server';
import type { ExtractedMetric, RequirementAnalysis } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';
import {
  buildAgent1RequirementSystemPrompt,
  buildAgent1RequirementUserPrompt,
} from '../prompts/maritime-prompts';

export interface Agent1Result {
  requirements: RequirementAnalysis;
  detectedWidgets: string[];
  prompts: PromptRecord[];
}

export async function runAgent1RequirementAnalyzer(prd: string, provider?: 'groq' | 'gemini'): Promise<Agent1Result> {
  const { widgets: detectedWidgets } = await mapWidgetsAsync(prd, provider);
  const systemPrompt = buildAgent1RequirementSystemPrompt();
  const userPrompt = buildAgent1RequirementUserPrompt(prd, detectedWidgets);

  let requirements: RequirementAnalysis = {
    domain: 'vessel monitoring',
    priority: 'operational',
    entities: ['navigation', 'fuel'],
    metrics: [
      { name: 'position', description: 'Vessel position', entity: 'navigation' },
      { name: 'fuel_level', description: 'Fuel levels', entity: 'fuel', unit: '%' }
    ],
    userGoal: 'operational bridge monitoring',
  };

  try {
    const { response } = await createChatCompletion(
      {
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      'Agent 1',
      { provider }
    );
    const raw = response.choices[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as Partial<RequirementAnalysis>;
    
    requirements = {
      domain: parsed.domain || requirements.domain,
      priority: parsed.priority || requirements.priority,
      entities: Array.isArray(parsed.entities) ? parsed.entities : requirements.entities,
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : requirements.metrics,
      userGoal: parsed.userGoal || requirements.userGoal,
    };
  } catch (err) {
    console.warn('Agent 1 LLM parse failed — using fallback requirements', err);
  }

  const prompts: PromptRecord[] = [
    {
      id: 'a1-system',
      agent: 'AGENT 1',
      role: 'system',
      label: 'Requirement Analyzer — System',
      content: systemPrompt,
      techniques: ['Entity extraction', 'Metric identification', 'Domain classification', 'Structured output'],
    },
    {
      id: 'a1-user',
      agent: 'AGENT 1',
      role: 'user',
      label: 'Requirement Analyzer — User',
      content: userPrompt,
      techniques: ['PRD parsing', 'Keyword grounding'],
    },
    {
      id: 'a1-output',
      agent: 'AGENT 1',
      role: 'system',
      label: 'Requirement Analyzer — Extracted',
      content: JSON.stringify(requirements, null, 2),
      techniques: ['JSON Validation', 'Semantic context'],
    },
  ];

  return { requirements, detectedWidgets, prompts };
}
