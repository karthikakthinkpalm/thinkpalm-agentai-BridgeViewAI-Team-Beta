/** Extract and parse JSON from LLM text that may include prose or markdown fences. */
export function parseJsonFromLlm<T>(raw: string): T | null {
  if (!raw?.trim()) return null;

  const candidates = new Set<string>();

  const stripped = raw
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  candidates.add(stripped);

  const objectSlice = extractBalancedJson(raw, '{', '}');
  if (objectSlice) candidates.add(objectSlice);

  const arraySlice = extractBalancedJson(raw, '[', ']');
  if (arraySlice) candidates.add(arraySlice);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function extractBalancedJson(text: string, open: '{' | '[', close: '}' | ']'): string | null {
  const start = text.indexOf(open);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}
