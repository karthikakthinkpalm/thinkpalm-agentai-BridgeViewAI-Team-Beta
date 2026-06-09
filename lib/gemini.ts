import { GoogleGenAI } from '@google/genai';

// Export a getter to ensure process.env is read at runtime
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({ apiKey });
}
