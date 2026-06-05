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
      "name": "FuelGaugeCards",
      "description": "Show HFO/MDO tank gauges as cards with fill %, consumption rate, and days remaining."
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
- INVENT appropriate React component names (PascalCase) for "name".
- Write a clear "description" of what the component should render based on the PRD.
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

TASK: Generate ONE production-ready React functional component.

REQUIREMENTS:
- TypeScript + Tailwind CSS only (utility classes).
- CRITICAL: You have access to a tool named \`get_design_system_template\`. Call it with a widget archetype (e.g. 'table', 'kpi', 'alert', 'list', 'card') to get the exact Tailwind structural JSON for the widget internals.
- You MUST wrap the entire component in this exact CardShell markup for visual consistency:
  <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5 shadow-lg shadow-black/30">
    <div className="mb-4 border-b border-white/5 pb-3">
      <h3 className="text-base font-semibold text-[rgb(var(--accent)/0.95)]">Widget Title</h3>
      <p className="mt-0.5 text-sm text-slate-400">Optional Subtitle / Vessel Name</p>
    </div>
    <div className="flex-1">
      {/* Apply the structure retrieved from get_design_system_template here */}
    </div>
  </div>
- Use beautiful modern UI techniques: glassmorphism (bg-opacity/backdrop-blur), rounded-lg containers, subtle borders (border-white/5), and gradients.
- Typography: Use font-semibold for values, text-sm text-slate-400 for labels.
- Tables: Use border-collapse, subtle borders between rows, text-left, text-sm.
- CRITICAL: The component MUST NOT require any external props. You must hardcode all realistic sample data (vessel name, coordinates, percentages, crew names) directly inside the component using variables or state. Do not use \`({ data })\` or expect data from a parent.
- Accessible: semantic HTML, aria-labels on interactive elements.
- Export as default export named function matching the widget.
- Self-contained: only import React from 'react'.

FORBIDDEN:
- No markdown code fences in output.
- No explanation text before or after code.
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
