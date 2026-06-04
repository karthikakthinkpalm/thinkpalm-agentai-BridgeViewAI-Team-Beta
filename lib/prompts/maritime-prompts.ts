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
} as const;

const WIDGET_EXEMPLAR = `{
  "domain": "vessel monitoring",
  "widgets": ["VoyageProgressTracker", "FuelGaugeCards"],
  "layout": "dashboard-grid",
  "priority": "safety-critical"
}`;

export function buildAgent1SystemPrompt(allowedWidgets: string[]): string {
  return `You are a maritime systems analyst and UX architect for bridge dashboards.

TASK: Read the product requirements document (PRD) and propose a widget hierarchy for a vessel monitoring dashboard.

OUTPUT RULES (strict):
- Return ONLY valid JSON. No markdown fences. No explanation.
- Use exactly this shape:
${WIDGET_EXEMPLAR}
- "widgets" MUST be a subset of this whitelist (use exact names): ${allowedWidgets.join(', ')}
- Prefer widgets that match PRD themes: voyage progress, fuel gauges, crew certification, alerts.
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
  return `You are a senior React engineer specializing in maritime bridge dashboards.

TASK: Generate ONE production-ready React functional component.

REQUIREMENTS:
- TypeScript + Tailwind CSS only (utility classes, no custom CSS files)
- Dark maritime theme: slate-900/950 backgrounds, teal/cyan accents, amber for warnings
- Include realistic sample data (vessel name, coordinates, percentages, crew names)
- Accessible: semantic HTML, aria-labels on interactive elements
- Responsive: works in dashboard grid cells (min-h suitable for cards)
- Export as default export named function matching the widget
- Self-contained: only import React from 'react'

FORBIDDEN:
- No markdown code fences in output
- No explanation text before or after code
- No external UI libraries
- No placeholder comments like "// add logic here"`;
}

export function buildAgent2UserPrompt(
  widget: string,
  domain: string,
  layout: string,
  priority: string
): string {
  const widgetHints: Record<string, string> = {
    VoyageProgressTracker:
      'Show route progress bar, ETA, distance remaining, current leg, and AIS-style position.',
    FuelGaugeCards:
      'Show HFO/MDO tank gauges as cards with fill %, consumption rate, and days remaining.',
    CrewCertificationStatus:
      'Show crew roster with STCW cert status, expiry dates, and compliance badges.',
    AlertPanel:
      'Show prioritized alerts (critical/warning/info) with timestamps and acknowledge actions.',
    VoyageTracker: 'Alias for voyage progress tracker UI.',
    FuelAnalytics: 'Alias for fuel gauge cards UI.',
    CrewPanel: 'Alias for crew certification status UI.',
    AlertCenter: 'Alias for alert panel UI.',
    WeatherWidget: 'Show wind, wave height, swell direction for current route.',
    EngineMonitor: 'Show RPM, load %, and machinery health indicators.',
    KPIDashboard: 'Show CII, efficiency KPIs in compact stat cards.',
  };

  const hint = widgetHints[widget] || `Build a ${widget} dashboard widget for maritime operations.`;

  return `Generate component: ${widget}

Domain: ${domain}
Dashboard layout: ${layout}
Operational priority: ${priority}

Widget specification:
${hint}

Return ONLY the complete .tsx component source code.`;
}

export function buildPromptRecords(
  prd: string,
  allowedWidgets: string[],
  detectedWidgets: string[],
  agent2Widgets: { widget: string; domain: string; layout: string; priority: string }[]
): PromptRecord[] {
  const records: PromptRecord[] = [
    {
      id: 'a1-system',
      agent: 'AGENT 1',
      role: 'system',
      label: 'PRD Parser — System',
      content: buildAgent1SystemPrompt(allowedWidgets),
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
      techniques: [PROMPT_TECHNIQUES.ROLE, PROMPT_TECHNIQUES.NEGATIVE, PROMPT_TECHNIQUES.FORMAT],
    });
    records.push({
      id: `a2-user-${w.widget}`,
      agent: 'AGENT 2',
      role: 'user',
      label: `UI Builder — ${w.widget} (User)`,
      content: buildAgent2UserPrompt(w.widget, w.domain, w.layout, w.priority),
      techniques: [PROMPT_TECHNIQUES.CONTEXT, PROMPT_TECHNIQUES.FEW_SHOT],
    });
  }

  return records;
}
