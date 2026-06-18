/** Build a Stitch generation prompt from a maritime PRD. */
export function buildStitchPrompt(
  prd: string,
  widgets?: string[],
  domain?: string,
  layout?: string
): string {
  const widgetHint =
    widgets && widgets.length > 0
      ? widgets.join(', ')
      : 'voyage progress, fuel gauges, alerts, crew status, engine monitor';

  return `Design a professional maritime vessel monitoring dashboard for desktop.

Product requirements:
${prd}

Design constraints:
- Device: wide desktop dashboard (1440px+)
- Theme: dark nautical UI with teal/cyan accents on deep slate backgrounds
- Domain: ${domain ?? 'vessel monitoring'}
- Layout: ${layout ?? 'responsive dashboard grid'}
- Widgets/sections: ${widgetHint}
- Do NOT include navigation tabs, menu bars, or header links unless each item has a real page URL
- Focus on dashboard content cards and data visualizations only
- Production-ready, polished UI for a ship operations center`;
}
