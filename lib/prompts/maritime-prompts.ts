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
  return `You are an expert Maritime UX Architect and Data Visualization agent.

TASK: Read the product requirements document (PRD) and propose a widget hierarchy for a vessel monitoring dashboard.

VISUALIZATION RULES (mandatory):
- Determine visualization by semantic domain — never reuse the same pattern across different domains.
- Weather → wind rose, weather map, heatmap, area charts (never KPI grids).
- Navigation → interactive maps, route timelines, voyage trackers.
- Operational KPIs → circular progress, bullet charts, sparklines (KPI cards only as last resort).
- Sustainability → grade indicators, emission trends, carbon gauges.
- Alerts → timelines, severity charts, incident heatmaps.
- Fleet → comparison tables, heatmaps, bubble charts.
- Ensure visual diversity across sections — no identical card layouts repeated.
- Prioritize charts, maps, timelines, gauges, and trend indicators over simple KPI cards.
- Explain why each visualization was selected.

OUTPUT RULES (strict):
- Return ONLY valid JSON. No markdown fences. No explanation.
- Use exactly this shape:
${WIDGET_EXEMPLAR}
- INVENT appropriate React component names (PascalCase) for "name". DO NOT use the word "Card" in the name (e.g. use Panel instead).
- Write a clear "description" of what the component should render based on the PRD. DO NOT use the word "card" in the description.
- "layout" is one of: dashboard-grid | bridge-split | alert-first
- "priority" is one of: safety-critical | operational | informational
- EXTREMELY CRITICAL: The WIDGET_EXEMPLAR above is purely for structural JSON reference. You MUST NOT copy or output the "VoyageProgressTracker" or "FuelGaugePanels" widgets unless the user explicitly asks for them. You MUST generate entirely new, custom widgets based EXCLUSIVELY on the user's PRD!`;
}

export function buildAgent1UserPrompt(
  prd: string,
  detectedWidgets: string[],
  visualizationAnalysis?: string
): string {
  return `PRD:
---
${prd}
---

The Widget Mapper tool detected these candidate widgets from keywords: ${detectedWidgets.join(', ') || 'none'}.

Visualization analysis (field → widget → reason):
${visualizationAnalysis ?? 'Pending analysis.'}

Confirm or refine the widget list. Align each widget description with the visualization justification above.`;
}

const REQUIREMENT_EXEMPLAR = `{
  "domain": "vessel monitoring",
  "priority": "operational",
  "userGoal": "monitor voyage and fuel on bridge dashboard",
  "entities": ["vessel", "navigation", "fuel"],
  "metrics": [
    { "name": "speed", "description": "Speed over ground", "entity": "navigation", "unit": "kn" },
    { "name": "fuel_level", "description": "HFO tank fill percentage", "entity": "fuel", "unit": "%" }
  ]
}`;

export function buildAgent1RequirementSystemPrompt(): string {
  return `You are Agent 1: Requirement Analyzer for maritime bridge dashboards.

TASK: Holistically evaluate the PRD to extract its semantic intent, operational domain, urgency, entities, and metrics. Do NOT select widgets or visualizations.

OUTPUT RULES:
- Return ONLY valid JSON matching this exact shape:
${REQUIREMENT_EXEMPLAR}
- "domain": Semantically infer the operational domain (e.g., "fleet operations", "cargo vessel monitoring", "passenger ferry", etc.).
- "priority": Semantically infer the urgency. Must be exactly one of: safety-critical | operational | informational.
- "userGoal": A short 5-10 word summary of the user's primary objective.
- "entities": Domain nouns extracted from the context (e.g., vessel, crew, fuel, navigation, weather).
- "metrics": Measurable data points with name, description, entity, and optional unit.`;
}

export function buildAgent1RequirementUserPrompt(prd: string, detectedWidgets: string[]): string {
  return `PRD:
---
${prd}
---

Keyword-detected widget hints (for context only): ${detectedWidgets.join(', ') || 'none'}

Extract all entities and metrics. Return JSON only.`;
}

export function buildAgent5SystemPrompt(): string {
  return `You are a senior React engineer and UI designer specializing in sleek, modern operational dashboards.

TASK: Generate ONE production-ready React functional component.

REQUIREMENTS:
- TypeScript + Tailwind CSS only (utility classes).
- Apply the design system structure JSON provided in the user message for widget internals (Tailwind class names and layout hierarchy).
- You MUST wrap the entire component in this exact CardShell markup for visual consistency:
  <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 shadow-lg shadow-black/30">
    <div className="mb-4 border-b border-white/5 pb-3">
      <h3 className="text-base font-semibold text-sky-400">Widget Title</h3>
      <p className="mt-0.5 text-sm text-slate-400">Optional Subtitle / Context</p>
    </div>
    <div className="flex-1">
      {/* Apply the design system structure here */}
    </div>
  </div>
- Use beautiful modern UI techniques matching the curated theme: \`bg-slate-950/60\` or \`bg-slate-900/50\` for inner containers, \`border-white/5\` for subtle borders.
- Typography: Use \`font-semibold text-slate-100\` for values, \`text-xs uppercase tracking-wider text-slate-500\` for labels. Use \`sky-400\`, \`cyan-400\`, or \`emerald-400\` for accents and gradients.
- Tables: Use border-collapse, subtle borders between rows, text-left, text-sm.
- CRITICAL: The component MUST NOT require any external props. You must hardcode all realistic sample data directly inside the component using variables or state. Make sure the hardcoded data exactly matches the domain context of the requested widget. Do not use \`({ data })\` or expect data from a parent.
- CRITICAL REACT SYNTAX RULES:
  - All adjacent JSX elements MUST be wrapped in an enclosing tag or fragment \`<></>\`. Do not return multiple root elements.
  - Ensure all ternary operators are complete (e.g., \`cond ? a : b\`). Never leave a nested ternary without a final fallback value.
- CRITICAL CSS & SVG RULES:
  - CRITICAL: If you use \`absolute\` positioning, you MUST add \`relative\` to its immediate parent container to prevent the element from breaking out and overlapping the entire screen.
  - DO NOT use raw \`<path>\` elements to draw complex custom vector icons (like engines, anchors, or ships). Use standard emoji or text abbreviations instead.
  - When drawing mathematical SVGs (like scatter plots), ensure coordinates (\`cx\`, \`cy\`, \`r\`) are scaled proportionally to a 100x100 viewBox. DO NOT hardcode massive fixed radiuses (like \`r={80}\`) that bleed out of the box.
  - You MAY use simple SVG geometry (like \`<circle>\` or \`<rect>\`) to build beautiful circular gauges, donut charts, scatter plots, or route maps. Use \`strokeDasharray\` and \`strokeDashoffset\` for circular progress.
  - If you use an SVG for a gauge, place it in a constrained container (e.g., \`relative h-24 w-24\`) and set the \`<svg>\` to \`-rotate-90\` to start at the top. CRITICAL: NEVER put \`<text>\` inside a rotated \`<svg>\`, or the text will be sideways! Put the text in an overlay \`div\` (e.g., \`absolute inset-0 flex items-center justify-center\`).
  - NEVER use \`vh\` or \`vw\` units for height/width calculations inside components, as this will break out of the container. Use \`%\` instead (e.g., \`height: \${value}%\`).
  - Do not attempt to draw decorative SVG corners or custom borders. Stick to Tailwind \`rounded-xl border\`.
  - Avoid using excessively large text sizes (like \`text-5xl\`) that will overflow cards. Use \`text-2xl\` max.
  - Never allow text to overlap other elements. You MUST use \`truncate\` or \`min-w-0\` on text containers inside flexbox layouts to ensure they don't bleed into neighbors.
  - Adapt background colors to the current theme. Unless explicitly rendering a light-themed dashboard, DO NOT use \`bg-white\` for large containers. Default to dark variants like \`bg-slate-900/50\`, \`bg-slate-800/40\`, etc.
- Accessible: semantic HTML, aria-labels on interactive elements.
- Export as default export named function matching the widget.
- Self-contained: only import React from 'react'.

FORBIDDEN:
- No markdown code fences in output.
- No explanation text before or after code.
- No external UI libraries.
- No placeholder comments like "// add logic here".
- No references to tools or function calls in output code.`;
}

export function buildAgent5UserPrompt(
  widgetName: string,
  widgetDescription: string,
  domain: string,
  layout: string,
  priority: string,
  archetype?: string,
  visualizationHints?: string,
  layoutHint?: string,
  designSystemTemplate?: string
): string {
  return `Generate component: ${widgetName}

Domain: ${domain}
Dashboard layout: ${layout}
Operational priority: ${priority}
${archetype ? `Required design archetype: ${archetype}` : ''}
${layoutHint ? `Layout placement: ${layoutHint}` : ''}
${designSystemTemplate ? `\nDesign system structure (apply these Tailwind classes and layout):\n${designSystemTemplate}` : ''}

Widget specification:
${widgetDescription}
${visualizationHints ? `\nVisualization rules:\n${visualizationHints}` : ''}

Return ONLY the complete .tsx component source code.`;
}

export function buildAgent2SystemPrompt(): string {
  return `You are a senior React engineer and UI designer specializing in sleek, modern maritime bridge dashboards.

TASK: Generate ONE production-ready React functional component.

REQUIREMENTS:
- TypeScript + Tailwind CSS only (utility classes).
- CRITICAL: You have access to a tool named \`get_design_system_template\`. Call it with a widget archetype (e.g. 'table', 'kpi', 'alert', 'list', 'card') to get the exact Tailwind structural JSON for the widget internals.
- You MUST wrap the entire component in this exact CardShell markup for visual consistency:
  <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 shadow-lg shadow-black/30">
    <div className="mb-4 border-b border-white/5 pb-3">
      <h3 className="text-base font-semibold text-sky-400">Widget Title</h3>
      <p className="mt-0.5 text-sm text-slate-400">Optional Subtitle / Vessel Name</p>
    </div>
    <div className="flex-1">
      {/* Apply the structure retrieved from get_design_system_template here */}
    </div>
  </div>
- Use beautiful modern UI techniques matching the curated theme: \`bg-slate-950/60\` or \`bg-slate-900/50\` for inner containers, \`border-white/5\` for subtle borders.
- Typography: Use \`font-semibold text-slate-100\` for values, \`text-xs uppercase tracking-wider text-slate-500\` for labels. Use \`sky-400\`, \`cyan-400\`, or \`emerald-400\` for accents and gradients.
- Tables: Use border-collapse, subtle borders between rows, text-left, text-sm.
- CRITICAL: The component MUST NOT require any external props. You must hardcode all realistic sample data (vessel name, coordinates, percentages, crew names) directly inside the component using variables or state. Do not use \`({ data })\` or expect data from a parent.
- CRITICAL CSS & SVG RULES:
  - DO NOT use \`absolute\` positioning to layer text over SVGs. Use standard Flexbox/Grid for layout.
  - If you use SVG, you MUST place it in a constrained container (e.g., \`h-32 w-full\`) and set the \`<svg>\` to \`h-full w-full\`. Do not let SVGs scale infinitely.
  - Avoid using excessively large text sizes (like \`text-5xl\`) that will overflow cards.
  - Never allow text to overlap other elements. Use semantic gaps (\`gap-4\`) and padding.
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
  priority: string,
  archetype?: string,
  visualizationHints?: string
): string {
  return `Generate component: ${widgetName}

Domain: ${domain}
Dashboard layout: ${layout}
Operational priority: ${priority}
${archetype ? `Required design archetype: ${archetype} (call get_design_system_template with this type first)` : ''}

Widget specification:
${widgetDescription}
${visualizationHints ? `\nUX Architect visualization rules:\n${visualizationHints}` : ''}

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
