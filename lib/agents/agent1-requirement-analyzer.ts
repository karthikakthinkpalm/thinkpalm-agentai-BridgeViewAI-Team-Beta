import { groq } from '../anthropic';
import { mapWidgets } from '../tools/widget-mapper';
import { parsePrdForPreview } from '../preview/parse-prd';
import type { ExtractedMetric, RequirementAnalysis } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';
import {
  buildAgent1RequirementSystemPrompt,
  buildAgent1RequirementUserPrompt,
} from '../prompts/maritime-prompts';
import { withRetry } from './shared';

export interface Agent1Result {
  requirements: RequirementAnalysis;
  detectedWidgets: string[];
  prompts: PromptRecord[];
}

const METRIC_PATTERNS: { pattern: RegExp; name: string; desc: string; entity: string; unit?: string }[] = [
  { pattern: /\b(sog|speed\s+over\s+ground|speed)\b/i, name: 'speed', desc: 'Vessel speed over ground', entity: 'navigation', unit: 'kn' },
  { pattern: /\b(cog|course)\b/i, name: 'course', desc: 'Course over ground', entity: 'navigation', unit: '°' },
  { pattern: /\b(eta|estimated\s+time)\b/i, name: 'eta', desc: 'Estimated time of arrival', entity: 'voyage', unit: 'datetime' },
  { pattern: /\b(hfo|fuel|bunker|consumption|burn)\b/i, name: 'fuel_level', desc: 'Fuel tank levels and consumption', entity: 'fuel', unit: '%' },
  { pattern: /\b(mdo|diesel)\b/i, name: 'mdo_level', desc: 'MDO tank level', entity: 'fuel', unit: '%' },
  { pattern: /\b(position|latitude|longitude|ais|mmsi)\b/i, name: 'position', desc: 'Vessel geographic position', entity: 'navigation' },
  { pattern: /\b(route|voyage|leg|waypoint)\b/i, name: 'route_progress', desc: 'Route and leg progress', entity: 'voyage' },
  { pattern: /\b(alert|alarm|critical|warning)\b/i, name: 'alerts', desc: 'Operational and safety alerts', entity: 'safety' },
  { pattern: /\b(crew|stcw|certification|roster)\b/i, name: 'crew_certs', desc: 'Crew certification status', entity: 'crew' },
  { pattern: /\b(engine|rpm|load|machinery)\b/i, name: 'engine_rpm', desc: 'Main engine RPM and load', entity: 'machinery', unit: 'rpm' },
  { pattern: /\b(weather|wind|wave|swell)\b/i, name: 'weather', desc: 'Environmental conditions', entity: 'environment' },
  { pattern: /\b(cii|kpi|efficiency)\b/i, name: 'kpi_efficiency', desc: 'Operational KPIs', entity: 'performance' },
];

function extractMetricsHeuristic(prd: string): ExtractedMetric[] {
  const found: ExtractedMetric[] = [];
  const seen = new Set<string>();
  for (const m of METRIC_PATTERNS) {
    if (m.pattern.test(prd) && !seen.has(m.name)) {
      seen.add(m.name);
      found.push({
        name: m.name,
        description: m.desc,
        entity: m.entity,
        unit: m.unit,
      });
    }
  }
  return found;
}

function extractEntities(prd: string, metrics: ExtractedMetric[]): string[] {
  const fromMetrics = [...new Set(metrics.map((m) => m.entity).filter(Boolean))] as string[];
  const preview = parsePrdForPreview(prd);
  const extras: string[] = [];
  if (preview.vesselName) extras.push(`vessel:${preview.vesselName}`);
  if (preview.route) extras.push(`route:${preview.route}`);
  return [...new Set([...fromMetrics, ...extras])];
}

function detectPriority(prd: string): string {
  const lower = prd.toLowerCase();
  if (/safety|critical|emergency|collision|steering/.test(lower)) return 'safety-critical';
  if (/informational|report|analytics/.test(lower)) return 'informational';
  return 'operational';
}

function detectDomain(prd: string): string {
  const lower = prd.toLowerCase();
  if (/fleet|multi.?vessel/.test(lower)) return 'fleet operations';
  if (/lng|tanker|cargo/.test(lower)) return 'cargo vessel monitoring';
  if (/ferry|passenger/.test(lower)) return 'passenger vessel monitoring';
  return 'vessel monitoring';
}

export async function runAgent1RequirementAnalyzer(prd: string): Promise<Agent1Result> {
  const detectedWidgets = mapWidgets(prd);
  const heuristicMetrics = extractMetricsHeuristic(prd);
  const systemPrompt = buildAgent1RequirementSystemPrompt();
  const userPrompt = buildAgent1RequirementUserPrompt(prd, detectedWidgets);

  let llmMetrics: ExtractedMetric[] = [];
  try {
    const response = await withRetry(
      () =>
        groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      3,
      'Agent 1'
    );
    const raw = response.choices[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { metrics?: ExtractedMetric[]; entities?: string[]; domain?: string; priority?: string; userGoal?: string };
    llmMetrics = Array.isArray(parsed.metrics) ? parsed.metrics : [];
  } catch {
    console.warn('Agent 1 LLM parse failed — using heuristic extraction');
  }

  const metricMap = new Map<string, ExtractedMetric>();
  for (const m of [...heuristicMetrics, ...llmMetrics]) {
    metricMap.set(m.name.toLowerCase(), m);
  }
  const metrics = [...metricMap.values()];
  if (metrics.length === 0) {
    metrics.push(
      { name: 'position', description: 'Vessel position', entity: 'navigation' },
      { name: 'fuel_level', description: 'Fuel levels', entity: 'fuel', unit: '%' }
    );
  }

  const requirements: RequirementAnalysis = {
    domain: detectDomain(prd),
    priority: detectPriority(prd),
    entities: extractEntities(prd, metrics),
    metrics,
    userGoal: 'operational bridge monitoring',
  };

  const prompts: PromptRecord[] = [
    {
      id: 'a1-system',
      agent: 'AGENT 1',
      role: 'system',
      label: 'Requirement Analyzer — System',
      content: systemPrompt,
      techniques: ['Entity extraction', 'Metric identification', 'Domain classification'],
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
      techniques: ['Structured output', 'Entity/metric catalog'],
    },
  ];

  return { requirements, detectedWidgets, prompts };
}
