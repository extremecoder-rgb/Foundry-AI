export interface RetryOptions {
  retries: number;
  minTimeoutMs: number;
  factor: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { retries: 3, minTimeoutMs: 500, factor: 2 }
): Promise<T> {
  let attempt = 0;
  let delay = options.minTimeoutMs;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= options.retries) {
        throw error;
      }
      console.warn(`[Resilience] Attempt ${attempt} failed. Retrying in ${delay}ms... Error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= options.factor;
    }
  }
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRatePerMs: number;

  constructor(maxRequests: number, perSeconds: number) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    this.refillRatePerMs = maxRequests / (perSeconds * 1000);
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }

  async acquire(): Promise<boolean> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  async waitForToken(): Promise<void> {
    while (!(await this.acquire())) {
      // Sleep for a short interval before trying again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Namespace-based rate limiters to avoid API rate limits
export const namespaceRateLimiters = new Map<string, RateLimiter>();

export function getRateLimiterForNamespace(namespace: string): RateLimiter {
  if (!namespaceRateLimiters.has(namespace)) {
    // Default rate limit: 10 requests per 5 seconds per namespace
    namespaceRateLimiters.set(namespace, new RateLimiter(10, 5));
  }
  return namespaceRateLimiters.get(namespace)!;
}
