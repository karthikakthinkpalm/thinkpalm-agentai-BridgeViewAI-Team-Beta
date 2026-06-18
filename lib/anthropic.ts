import 'server-only';

import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY || '';
const maskedKey = apiKey.length > 8 
  ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
  : 'NOT_SET';

console.log(`[Init] Groq API Key loaded: ${maskedKey}`);

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});