import type { PromptRecord } from '@/lib/prompts/maritime-prompts';
import { PROMPT_TECHNIQUES } from '@/lib/prompts/maritime-prompts';
import { buildStitchPrompt } from './build-prompt';

const STITCH_SYSTEM_PROMPT = `You are Google Stitch — an AI-native UI design system powered by Gemini.

TASK: Generate a high-fidelity desktop dashboard from the product requirements document (PRD).

OUTPUT: Production-ready HTML/CSS matching the PRD domain, layout, and widget requirements.

DESIGN RULES:
- Dark nautical theme with teal/cyan accents on deep slate backgrounds
- Wide desktop layout (1440px+)
- Card-based widget sections with realistic maritime sample data
- No decorative navigation unless every item has a real URL

The generation prompt below is sent to the Stitch API (STITCH_API_KEY) with device type DESKTOP.`;

const SANITIZE_PROMPT = `POST-PROCESSING (applied after Stitch returns HTML):

1. Remove all <a> tags without actionable href (empty, #, javascript:)
2. Remove buttons and [role="tab"] items without real redirect targets
3. Remove empty nav and tablist containers
4. Inject client-side sanitizer as fallback in the live preview iframe

This ensures the live preview only shows actionable links and matches production export.`;

const PRODUCTION_PROMPT = `PRODUCTION CODE EXTRACTION (from sanitized live preview HTML):

1. Extract global <style> blocks → DashboardStyles.tsx
2. Split top-level body sections → DashboardSectionN.tsx (or named by id/class)
3. Compose StitchDashboard.tsx root that imports all sections
4. Each section uses dangerouslySetInnerHTML to preserve Stitch layout fidelity

The Production Code tab and StackBlitz export use these extracted components.`;

export function buildStitchPromptRecords(opts: {
  prd: string;
  widgets?: string[];
  domain?: string;
  layout?: string;
  componentTree: string[];
  screenId: string;
  projectId: string;
}): PromptRecord[] {
  const generationPrompt = buildStitchPrompt(
    opts.prd,
    opts.widgets,
    opts.domain,
    opts.layout
  );

  const records: PromptRecord[] = [
    {
      id: 'stitch-system',
      agent: 'STITCH',
      role: 'system',
      label: 'Live Preview Generator — System',
      content: STITCH_SYSTEM_PROMPT,
      techniques: [PROMPT_TECHNIQUES.ROLE, PROMPT_TECHNIQUES.CONTEXT, PROMPT_TECHNIQUES.FORMAT],
    },
    {
      id: 'stitch-user',
      agent: 'STITCH',
      role: 'user',
      label: 'Live Preview — Stitch Generation Prompt',
      content: generationPrompt,
      techniques: [PROMPT_TECHNIQUES.CONTEXT, PROMPT_TECHNIQUES.NEGATIVE, PROMPT_TECHNIQUES.GROUNDING],
    },
    {
      id: 'stitch-sanitize',
      agent: 'STITCH',
      role: 'system',
      label: 'Post-Processing — Preview Sanitization',
      content: SANITIZE_PROMPT,
      techniques: [PROMPT_TECHNIQUES.NEGATIVE, PROMPT_TECHNIQUES.FORMAT],
    },
    {
      id: 'stitch-production',
      agent: 'STITCH',
      role: 'system',
      label: 'Production Code — Extraction Rules',
      content: PRODUCTION_PROMPT,
      techniques: [PROMPT_TECHNIQUES.FORMAT, PROMPT_TECHNIQUES.FEW_SHOT],
    },
    {
      id: 'stitch-metadata',
      agent: 'STITCH',
      role: 'user',
      label: 'Generation Metadata',
      content: [
        `Project ID: ${opts.projectId}`,
        `Screen ID: ${opts.screenId}`,
        `Domain: ${opts.domain ?? 'vessel monitoring'}`,
        `Layout: ${opts.layout ?? 'dashboard-grid'}`,
        `Widgets detected: ${opts.widgets?.join(', ') || 'none'}`,
        `Components extracted: ${opts.componentTree.join(', ') || 'StitchDashboard'}`,
      ].join('\n'),
      techniques: [PROMPT_TECHNIQUES.FORMAT, PROMPT_TECHNIQUES.CONTEXT],
    },
  ];

  for (const name of opts.componentTree) {
    records.push({
      id: `stitch-component-${name}`,
      agent: 'STITCH',
      role: 'user',
      label: `Production Component — ${name}.tsx`,
      content: `React component "${name}" extracted from the Stitch live preview HTML.

Source: PRD → Stitch API → sanitized HTML → htmlToProductionComponents()
${name === 'StitchDashboard' ? 'Root dashboard wrapper composing all preview sections.' : ''}
${name === 'DashboardStyles' ? 'Global CSS styles extracted from <style> tags in the preview.' : ''}
${name.startsWith('Dashboard') || name.includes('Section') ? 'Section panel matching a top-level block in the live preview.' : ''}`,
      techniques: [PROMPT_TECHNIQUES.CONTEXT, PROMPT_TECHNIQUES.FORMAT],
    });
  }

  return records;
}
