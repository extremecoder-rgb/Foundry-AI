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
      
      let waitTime = delay;
      const errorMessage = error.message || '';

      if (errorMessage.includes('GenerateRequestsPerDay')) {
        console.warn(`[Resilience] Daily API quota exhausted! Aborting retries immediately to trigger fallback.`);
        throw error;
      }
      const isRateLimit = error.status === 429 || 
                          errorMessage.includes('429') ||
                          errorMessage.toLowerCase().includes('quota exceeded') ||
                          errorMessage.toLowerCase().includes('resource_exhausted');

      if (isRateLimit) {
        const matchSec = errorMessage.match(/Please retry in (\d+\.?\d*)s/i);
        const matchMs = errorMessage.match(/Please retry in (\d+\.?\d*)ms/i);
        
        if (matchSec) {
          waitTime = Math.ceil(parseFloat(matchSec[1]) * 1000) + 1500; // wait extra 1.5s for safety
        } else if (matchMs) {
          waitTime = Math.ceil(parseFloat(matchMs[1])) + 1000;
        } else {
          waitTime = Math.max(delay, 30000); // default fallback to 30s
        }
        console.warn(`[Resilience] Quota exceeded. Parsing rate-limit backoff: waiting ${waitTime}ms before attempt ${attempt + 1}...`);
      } else {
        console.warn(`[Resilience] Attempt ${attempt} failed. Retrying in ${delay}ms... Error:`, errorMessage);
      }

      await new Promise(resolve => setTimeout(resolve, waitTime));
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
