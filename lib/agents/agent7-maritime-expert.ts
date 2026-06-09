import type { MaritimeReviewResult, RequirementAnalysis, SelectedWidget } from '../types/pipeline';
import type { PromptRecord } from '../prompts/maritime-prompts';

const MARITIME_TERMS = /\b(vessel|ship|bridge|ais|stcw|hfo|mdo|knot|nautical|voyage|leg|eta|rpm|bunker|maritime|navigation|ecdis)\b/i;
const SAFETY_WIDGETS = new Set(['AlertPanel', 'CrewCertificationStatus', 'VoyageProgressTracker']);

export interface Agent7Result {
  maritimeReview: MaritimeReviewResult;
  prompts: PromptRecord[];
}

export function runAgent7MaritimeExpert(
  requirements: RequirementAnalysis,
  selectedWidgets: SelectedWidget[],
  components: Record<string, string>
): Agent7Result {
  const findings: string[] = [];
  let score = 100;

  const allCode = Object.values(components).join('\n');
  if (!MARITIME_TERMS.test(allCode + requirements.domain)) {
    findings.push('Generated components lack maritime domain terminology');
    score -= 15;
  }

  if (requirements.priority === 'safety-critical') {
    const hasSafety = selectedWidgets.some((w) => SAFETY_WIDGETS.has(w.name));
    if (!hasSafety) {
      findings.push('Safety-critical PRD but no alert/voyage/crew safety widget selected');
      score -= 20;
    }
  }

  const hasNavigation = selectedWidgets.some((w) =>
    /Voyage|AIS|GPS|Tracker/i.test(w.name)
  );
  const hasNavMetric = requirements.metrics.some((m) =>
    /position|route|speed|ais/i.test(m.name)
  );
  if (hasNavMetric && !hasNavigation) {
    findings.push('Navigation metrics detected but no map/route widget assigned');
    score -= 15;
  }

  const hasFuel = requirements.metrics.some((m) => /fuel|hfo|mdo|tank/i.test(m.name));
  const hasFuelWidget = selectedWidgets.some((w) => /Fuel/i.test(w.name));
  if (hasFuel && !hasFuelWidget) {
    findings.push('Fuel metrics present without fuel gauge widget');
    score -= 10;
  }

  if (selectedWidgets.length === 0) {
    findings.push('No widgets selected for maritime dashboard');
    score -= 30;
  }

  if (findings.length === 0) {
    findings.push('Maritime domain coverage verified — widgets align with vessel monitoring standards');
  }

  const approved = score >= 70;
  const maritimeReview: MaritimeReviewResult = {
    approved,
    score: Math.max(0, score),
    findings,
    summary: approved
      ? `Maritime expert approved (${score}/100) for ${requirements.domain}`
      : `Maritime expert review requires attention (${score}/100)`,
  };

  const prompts: PromptRecord[] = [
    {
      id: 'a7-maritime',
      agent: 'AGENT 7',
      role: 'system',
      label: 'Maritime Expert — Domain Validation',
      content: JSON.stringify(maritimeReview, null, 2),
      techniques: ['STCW/safety coverage', 'Navigation widget check', 'Domain terminology audit'],
    },
  ];

  return { maritimeReview, prompts };
}
