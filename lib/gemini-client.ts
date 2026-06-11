import { GoogleGenAI } from '@google/genai';
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam, ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

export const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

const DEFAULT_GEMINI_CHAIN = [
  'gemini-2.5-flash',
] as const;

function getGeminiModelChain(preferredModel?: string | null, allowedModels?: string[]): string[] {
  let chain: string[] = [...DEFAULT_GEMINI_CHAIN];
  if (preferredModel && chain.includes(preferredModel)) {
    chain = [preferredModel, ...chain.filter((m) => m !== preferredModel)];
  }
  if (allowedModels) {
    chain = chain.filter((m) => allowedModels.includes(m));
    if (chain.length === 0) chain = ['gemini-2.5-flash']; // Fallback if filtered out
  }
  return chain;
}

export async function createGeminiChatCompletion(
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'>,
  label = 'Gemini',
  options?: { preferredModel?: string | null; allowedModels?: string[] }
): Promise<{ response: ChatCompletion; model: string }> {
  const chain = getGeminiModelChain(options?.preferredModel, options?.allowedModels);
  let lastError: unknown;

  // Convert OpenAI/Groq messages to Gemini contents
  let systemInstruction: string | undefined = undefined;
  const contents: any[] = [];

  for (const msg of params.messages) {
    if (msg.role === 'system') {
      systemInstruction = (systemInstruction ? systemInstruction + '\n\n' : '') + msg.content;
    } else if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      // Basic support for assistant messages
      if (msg.content) {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }
  }

  // Convert OpenAI/Groq tools to Gemini tools
  let tools: any[] | undefined = undefined;
  let toolConfig: any = undefined;

  if (params.tools && params.tools.length > 0) {
    tools = [{
      functionDeclarations: params.tools.map((t: any) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }];

    if (params.tool_choice === 'required' || (params.tool_choice && typeof params.tool_choice === 'object' && params.tool_choice.type === 'function')) {
      // Force function calling
      toolConfig = { functionCallingConfig: { mode: 'ANY' } };
      if (params.tool_choice && typeof params.tool_choice === 'object' && params.tool_choice.function?.name) {
        toolConfig.functionCallingConfig.allowedFunctionNames = [params.tool_choice.function.name];
      }
    } else if (params.tool_choice === 'none') {
      toolConfig = { functionCallingConfig: { mode: 'NONE' } };
    } else {
      toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
    }
  }

  const config: any = {
    temperature: params.temperature ?? 0.7,
    systemInstruction,
    tools,
    toolConfig,
    responseMimeType: params.response_format?.type === 'json_object' ? 'application/json' : undefined,
  };

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    let retries = 0;
    while (retries < 3) {
      try {
        const response = await geminiClient.models.generateContent({
          model,
          contents,
          config,
        });

        console.log(`[${label}] Using model: ${model}`);
        if (i > 0) {
          console.log(`${label}: switched to fallback model "${model}"`);
        }

        // Map Gemini response back to OpenAI/Groq format
        let toolCalls: any = undefined;
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          toolCalls = functionCalls.map((fc: any, index: number) => ({
            id: `call_${index}`,
            type: 'function',
            function: {
              name: fc.name,
              arguments: typeof fc.args === 'string' ? fc.args : JSON.stringify(fc.args || {}),
            },
          }));
        }

        const mappedResponse: any = {
          id: 'gemini-' + Date.now(),
          choices: [
            {
              message: {
                role: 'assistant',
                content: response.text || null,
                tool_calls: toolCalls,
              },
              finish_reason: toolCalls ? 'tool_calls' : 'stop',
            },
          ],
        };

        return { response: mappedResponse as ChatCompletion, model };
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('exhausted');
        const isUnavailable = err.status === 503 || err.message?.includes('503') || err.message?.includes('high demand');
        
        if (isUnavailable || isRateLimit) {
          retries++;
          if (retries < 3) {
            console.warn(`[${label}] Model ${model} is busy/rate-limited. Retrying (${retries}/3) in 2 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }
        }
        
        if (!isRateLimit && !isUnavailable) {
            // Log other errors specifically
            console.error(`[${label}] Model ${model} failed with non-retryable error:`, err.message);
            throw err;
        }
        
        const hasNext = i < chain.length - 1;
        console.warn(
          `${label}: model "${model}" unavailable${hasNext ? ' — trying next model' : ''}`
        );
        break; // Break the retry loop, go to the next model in the chain
      }
    }
  }

  throw lastError;
}
