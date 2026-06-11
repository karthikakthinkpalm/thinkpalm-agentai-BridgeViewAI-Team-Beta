import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions';
import { createChatCompletion as createGroqChatCompletion, type GroqChatResult } from './groq-chat';
import { createGeminiChatCompletion } from './gemini-client';

export type LLMProvider = 'groq' | 'gemini';

export interface LLMRouterOptions {
  provider?: LLMProvider;
  preferredModel?: string | null;
  allowedModels?: string[];
}

export async function createChatCompletion(
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'>,
  label = 'LLM',
  options?: LLMRouterOptions
): Promise<GroqChatResult> {
  const provider = options?.provider || 'groq';

  if (provider === 'gemini') {
    return createGeminiChatCompletion(params, label, options);
  } else {
    return createGroqChatCompletion(params, label, options);
  }
}
