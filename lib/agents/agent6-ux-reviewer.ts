import type { UXReviewIssue, UXReviewResult } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';
import type { SelectedWidget } from '../types/pipeline';

function reviewComponent(widget: string, code: string, selected?: SelectedWidget): UXReviewIssue[] {
  const issues: UXReviewIssue[] = [];

  if (!code.includes('CardShell') && !code.includes('rounded-2xl border')) {
    issues.push({ widget, severity: 'warning', message: 'Missing standard CardShell wrapper — visual consistency may break' });
  }
  if (code.includes('<table') && selected && /gauge|map|chart/i.test(selected.visualization)) {
    issues.push({ widget, severity: 'error', message: 'Table used where gauge/map visualization was recommended' });
  }
  if (!code.includes('aria-') && !code.includes('role=')) {
    issues.push({ widget, severity: 'warning', message: 'No aria-labels detected — accessibility gap' });
  }
  if (code.includes('get_design_system_template')) {
    issues.push({ widget, severity: 'error', message: 'Runtime reference to design-system tool in output code' });
  }
  if (code.includes('// add logic') || code.includes('TODO')) {
    issues.push({ widget, severity: 'info', message: 'Placeholder comments found in production code' });
  }
  if (code.length < 200) {
    issues.push({ widget, severity: 'warning', message: 'Component suspiciously short — may be incomplete' });
  }

  return issues;
}

export interface Agent6Result {
  uxReview: UXReviewResult;
  prompts: PromptRecord[];
}

export function runAgent6UXReviewer(
  components: Record<string, string>,
  selectedWidgets: SelectedWidget[]
): Agent6Result {
  const issues: UXReviewIssue[] = [];
  const widgetMap = new Map(selectedWidgets.map((w) => [w.name, w]));

  for (const [widget, code] of Object.entries(components)) {
    issues.push(...reviewComponent(widget, code, widgetMap.get(widget)));
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 8);
  const passed = errors === 0 && score >= 60;

  const uxReview: UXReviewResult = {
    passed,
    score,
    issues,
    summary: passed
      ? `UX review passed (${score}/100) — ${Object.keys(components).length} widgets validated`
      : `UX review flagged ${errors} error(s), ${warnings} warning(s) — score ${score}/100`,
  };

  const prompts: PromptRecord[] = [
    {
      id: 'a6-ux-review',
      agent: 'AGENT 6',
      role: 'system',
      label: 'UX Reviewer — Usability Validation',
      content: JSON.stringify(uxReview, null, 2),
      techniques: ['Accessibility check', 'Visualization fidelity', 'CardShell consistency'],
    },
  ];

  return { uxReview, prompts };
}
