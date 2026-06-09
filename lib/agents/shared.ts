export function isRateLimitError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  return (
    e.status === 429 ||
    Boolean(
      e.message &&
        (e.message.includes('429') ||
          e.message.includes('Rate limit') ||
          e.message.includes('rate_limit'))
    )
  );
}

export function isLlmUnavailableError(err: unknown): boolean {
  if (isRateLimitError(err)) return true;
  const e = err as { status?: number; message?: string };
  return (
    e.status === 401 ||
    e.status === 403 ||
    Boolean(e.message && (e.message.includes('API key') || e.message.includes('invalid_api_key')))
  );
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, label = 'Agent'): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit = isRateLimitError(err);
      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        console.warn(`Rate limited (429) ${label}. Retrying in ${attempt * 5}s...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}
