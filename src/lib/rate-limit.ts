// In-memory token-bucket rate limiter, keyed by caller-supplied key (usually IP).
// Resets on cold start / per serverless instance - good enough to blunt casual
// abuse and accidental retry storms, not a substitute for an edge/shared limiter.

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const refillPerMs = limit / windowMs;
  const existing = buckets.get(key);

  if (!existing) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { tokens: limit - 1, updatedAt: now });
    return true;
  }

  const elapsed = now - existing.updatedAt;
  const tokens = Math.min(limit, existing.tokens + elapsed * refillPerMs);
  existing.updatedAt = now;

  if (tokens < 1) {
    existing.tokens = tokens;
    return false;
  }

  existing.tokens = tokens - 1;
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
