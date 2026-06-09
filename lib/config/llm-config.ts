export type LLMProvider = 'groq' | 'gemini';

export const LLM_CONFIG = {
  groq: {
    // Current primary model for Llama
    model: 'llama-3.3-70b-versatile',
  },
  gemini: {
    // Current primary model for Gemini
    model: 'gemini-2.5-flash',
  }
};
