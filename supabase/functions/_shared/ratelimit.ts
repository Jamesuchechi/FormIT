import { HttpError } from "./http.ts";

interface RateLimitConfig {
  /** Maximum allowed requests in window */
  max: number;
  /** Window duration in milliseconds (default: 60,000ms = 1 min) */
  windowMs?: number;
}

const hits = new Map<string, number[]>();

/** Clean up entries older than 5 minutes periodically */
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of hits.entries()) {
    const valid = timestamps.filter((t) => now - t < 300_000);
    if (valid.length === 0) hits.delete(key);
    else hits.set(key, valid);
  }
}, 60_000);

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/**
 * Check and enforce rate limits for a given key (IP address or form ID).
 * Throws HttpError(429, "rate_limited") if threshold is exceeded.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): void {
  const windowMs = config.windowMs ?? 60_000;
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= config.max) {
    throw new HttpError(429, "rate_limited", {
      retryAfterSeconds: Math.ceil((timestamps[0] + windowMs - now) / 1000),
    });
  }

  timestamps.push(now);
  hits.set(key, timestamps);
}

/** Rate limits both client IP and target form. */
export function rateLimit(req: Request, formSlug: string): void {
  const ip = getClientIp(req);
  // Max 60 requests per minute per IP
  checkRateLimit(`ip:${ip}`, { max: 60, windowMs: 60_000 });
  // Max 120 requests per minute per form
  checkRateLimit(`form:${formSlug}`, { max: 120, windowMs: 60_000 });
}
