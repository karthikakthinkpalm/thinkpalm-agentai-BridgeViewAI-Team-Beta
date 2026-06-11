import 'server-only';

import type { ChatCompletion } from 'groq-sdk/resources/chat/completions';
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions';
import { isLlmUnavailableError } from '@/lib/agents/shared';
import { groq } from '@/lib/anthropic';

const DEFAULT_MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
] as const;

export function getGroqModelChain(preferredModel?: string | null): string[] {
  const fromEnv = process.env.GROQ_MODEL_FALLBACK_CHAIN?.split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  const chain = fromEnv?.length ? fromEnv : [...DEFAULT_MODEL_CHAIN];

  if (preferredModel && chain.includes(preferredModel)) {
    return [preferredModel, ...chain.filter((m) => m !== preferredModel)];
  }

  return chain;
}

export type GroqChatResult = {
  response: ChatCompletion;
  model: string;
};

/** Try each model in the fallback chain when the previous hits rate limits or is unavailable. */
export async function createChatCompletion(
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'>,
  label = 'Groq',
  options?: { preferredModel?: string | null; allowedModels?: string[] }
): Promise<GroqChatResult> {
  let chain = getGroqModelChain(options?.preferredModel);
  if (options?.allowedModels) {
    chain = chain.filter((m) => options.allowedModels!.includes(m));
  }
  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const response = await groq.chat.completions.create({ ...params, model });
      console.log(`[${label}] Using model: ${model}`);
      if (i > 0) {
        console.log(`${label}: switched to fallback model "${model}"`);
      }
      return { response, model };
    } catch (err) {
      lastError = err;
      if (!isLlmUnavailableError(err)) throw err;
      const hasNext = i < chain.length - 1;
      console.warn(
        `${label}: model "${model}" unavailable${hasNext ? ' — trying next model' : ''}`
      );
    }
  }

  throw lastError;
}
