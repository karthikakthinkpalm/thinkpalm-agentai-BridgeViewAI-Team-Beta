/**
 * Centralized prompt engineering for the maritime UI agent pipeline.
 * Techniques: role assignment, constrained output, few-shot structure, tool grounding.
 */

export interface PromptRecord {
  id: string;
  agent: string;
  role: 'system' | 'user';
  label: string;
  content: string;
  techniques: string[];
}

export const PROMPT_TECHNIQUES = {
  ROLE: 'Role assignment — specialist persona',
  FORMAT: 'Output format constraint — JSON / TSX only',
  GROUNDING: 'Tool grounding — widget mapper whitelist',
  FEW_SHOT: 'Structural few-shot — exemplar schema shape',
  CONTEXT: 'Domain context injection — maritime metadata',
  NEGATIVE: 'Negative constraints — no markdown, no imports',
  TOOL_CALL: 'Tool calling — autonomous design system access',
} as const;

const WIDGET_EXEMPLAR = `{
  "domain": "vessel monitoring",
  "widgets": [
    {
      "name": "VoyageProgressTracker",
      "description": "Show route progress bar, ETA, distance remaining, current leg, and AIS-style position."
    },
    {
      "name": "FuelGaugePanels",
      "description": "Show HFO/MDO tank gauges as UI panels with fill %, consumption rate, and days remaining."
    }
  ],
  "layout": "dashboard-grid",
  "priority": "safety-critical"
}`;

export function buildAgent1SystemPrompt(): string {
  return `You are a maritime systems analyst and UX architect for bridge dashboards.

TASK: Read the product requirements document (PRD) and propose a widget hierarchy for a vessel monitoring dashboard.

OUTPUT RULES (strict):
- Return ONLY valid JSON. No markdown fences. No explanation.
- Use exactly this shape:
${WIDGET_EXEMPLAR}
- INVENT appropriate React component names (PascalCase) for "name". DO NOT use the word "Card" in the name (e.g. use Panel instead).
- Write a clear "description" of what the component should render based on the PRD. DO NOT use the word "card" in the description.
- "layout" is one of: dashboard-grid | bridge-split | alert-first
- "priority" is one of: safety-critical | operational | informational`;
}

export function buildAgent1UserPrompt(prd: string, detectedWidgets: string[]): string {
  return `PRD:
---
${prd}
---

The Widget Mapper tool detected these candidate widgets from keywords: ${detectedWidgets.join(', ') || 'none'}.
Confirm or refine this list in your JSON response.`;
}

export function buildAgent2SystemPrompt(): string {
  return `You are a senior React engineer and UI designer specializing in sleek, modern maritime bridge dashboards.

- Typography: Use font-semibold for values (text-lg or text-xl), text-sm text-slate-400 for labels. Always left-align labels unless inside a tight grid.
- Icons: You MUST use ONLY these exact Lucide icon names: \`Activity\`, \`AlertCircle\`, \`CheckCircle\`, \`Compass\`, \`Navigation\`, \`Ship\`, \`Thermometer\`, \`Battery\`, \`Zap\`, \`FileText\`, \`Award\`, \`Shield\`, \`Clock\`, \`Map\`. DO NOT guess other names like ExclamationCircle.
- CRITICAL: The component MUST NOT require any external props. You must hardcode all realistic sample data directly inside the component using variables or state.
- CRITICAL: You MUST write explicit imports for everything you use. (e.g., \`import { RadialBarChart, RadialBar } from 'recharts';\` and \`import { Activity, AlertCircle } from 'lucide-react';\`). Do NOT assume global scope.
- Accessible: semantic HTML, aria-labels on interactive elements.
FORBIDDEN:
- EXTREMELY CRITICAL: You are NOT ALLOWED to use any custom React UI components (like Material UI or Chakra). This means NO capitalized tags like \`<Flex>\`, \`<Grid>\`, \`<Table>\`, \`<Thead>\`, \`<Tbody>\`, \`<Tr>\`, \`<Td>\`, \`<Input>\`, \`<Button>\`, \`<Badge>\`, \`<Card>\`, \`<CardHeader>\`, \`<CardContent>\`, \`<CardTitle>\`, etc.
- If you need a table, use lowercase HTML: \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<td>\`.
- If you need a layout, use lowercase HTML: \`<div className="flex">\` or \`<div className="grid">\`.
- The ONLY capitalized tags allowed anywhere in your code are the specific Recharts and Lucide components listed above. Everything else MUST be lowercase HTML.
- CRITICAL: DO NOT use utility libraries like \`date-fns\`, \`moment\`, or \`lodash\`. Use native JavaScript (e.g., \`new Date().toLocaleDateString()\`) for formatting.
- No markdown code fences in output.
- No explanation or conversational text. Output ONLY the raw TSX code.
- No external UI libraries.
- No placeholder comments like "// add logic here".`;
}

export function buildAgent2UserPrompt(
  widgetName: string,
  widgetDescription: string,
  domain: string,
  layout: string,
  priority: string
): string {
  return `Generate component: ${widgetName}

Domain: ${domain}
Dashboard layout: ${layout}
Operational priority: ${priority}

Widget specification:
${widgetDescription}

Return ONLY the complete .tsx component source code.`;
}

export function buildPromptRecords(
  prd: string,
  allowedWidgets: string[],
  detectedWidgets: string[],
  agent2Widgets: { widget: string; description: string; domain: string; layout: string; priority: string }[]
): PromptRecord[] {
  const records: PromptRecord[] = [
    {
      id: 'a1-system',
      agent: 'AGENT 1',
      role: 'system',
      label: 'PRD Parser — System',
      content: buildAgent1SystemPrompt(),
      techniques: [PROMPT_TECHNIQUES.ROLE, PROMPT_TECHNIQUES.FORMAT, PROMPT_TECHNIQUES.FEW_SHOT, PROMPT_TECHNIQUES.GROUNDING],
    },
    {
      id: 'a1-user',
      agent: 'AGENT 1',
      role: 'user',
      label: 'PRD Parser — User',
      content: buildAgent1UserPrompt(prd, detectedWidgets),
      techniques: [PROMPT_TECHNIQUES.CONTEXT, PROMPT_TECHNIQUES.GROUNDING],
    },
  ];

  for (const w of agent2Widgets) {
    records.push({
      id: `a2-system-${w.widget}`,
      agent: 'AGENT 2',
      role: 'system',
      label: `UI Builder — ${w.widget} (System)`,
      content: buildAgent2SystemPrompt(),
      techniques: [PROMPT_TECHNIQUES.ROLE, PROMPT_TECHNIQUES.NEGATIVE, PROMPT_TECHNIQUES.FORMAT, PROMPT_TECHNIQUES.TOOL_CALL],
    });
    records.push({
      id: `a2-user-${w.widget}`,
      agent: 'AGENT 2',
      role: 'user',
      label: `UI Builder — ${w.widget} (User)`,
      content: buildAgent2UserPrompt(w.widget, w.description, w.domain, w.layout, w.priority),
      techniques: [PROMPT_TECHNIQUES.CONTEXT, PROMPT_TECHNIQUES.FEW_SHOT],
    });
  }

  return records;
}
