import "server-only";

/**
 * Fixed-window rate limiter, in-memory only.
 *
 * Honest limitation: this state lives in the Node process, not a shared
 * store. On Vercel, each serverless instance (and each cold start) gets its
 * own empty map, so a burst spread across multiple instances isn't caught by
 * this alone. It still stops the common case — one client hammering a route
 * from a single connection/instance — and costs nothing to run. If this ever
 * needs to hold under a real distributed attack, swap this for a shared
 * store (e.g. Upstash Redis, which is what most Vercel deployments reach for)
 * without changing any call site — they only see checkRateLimit()'s boolean.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Prevents `buckets` from growing forever across a long-lived instance.
let lastSweep = Date.now();
function sweepExpired() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/** Returns true if this call is within limit, false if it should be rejected (429). */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  sweepExpired();

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
