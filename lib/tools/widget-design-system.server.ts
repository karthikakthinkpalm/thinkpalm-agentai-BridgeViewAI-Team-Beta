import 'server-only';

import { llmDesignSystemTemplate } from './llm-fallback';
import { getDesignSystemTemplateFromConfig } from './widget-design-system';

/** Config-driven with LLM generation for unknown archetypes. */
export async function getDesignSystemTemplate(type: string): Promise<string> {
  const fromConfig = getDesignSystemTemplateFromConfig(type);
  if (!fromConfig.includes('"error"')) return fromConfig;
  try {
    return await llmDesignSystemTemplate(type);
  } catch (err) {
    console.warn(`LLM design template failed for ${type}`, err);
    return fromConfig;
  }
}
