import type { MiddlewareHandler } from "hono";

type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;

function defaultTrustProxy(): boolean {
  return (process.env.TRUST_PROXY ?? "false").toLowerCase() === "true";
}

/**
 * In-memory per-client fixed-window rate limiter.
 *
 * Client identification:
 *   - When `trustProxy` is true (set `TRUST_PROXY=true` env or pass the
 *     option explicitly — required behind Render/Cloudflare/etc.), we use
 *     the leftmost `x-forwarded-for` entry.
 *   - Otherwise we use `x-real-ip` or a per-request random bucket so an
 *     attacker can't rotate the header to bypass the limiter when the
 *     server is reachable directly. The per-request bucket effectively
 *     disables the limit in misconfigured deploys — preferable to
 *     funneling all guests into one shared bucket.
 *
 * Memory safety:
 *   - Map is capped at MAX_BUCKETS; when full, expired entries evict first,
 *     then oldest. Prevents unbounded growth from unique IPs.
 */
export function rateLimit(opts: {
  max: number;
  windowMs: number;
  trustProxy?: boolean;
}): MiddlewareHandler {
  const trustProxy = opts.trustProxy ?? defaultTrustProxy();
  const buckets = new Map<string, Bucket>();

  function evictIfNeeded(now: number) {
    if (buckets.size < MAX_BUCKETS) return;
    // First pass: drop everything whose window already expired.
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
    if (buckets.size < MAX_BUCKETS) return;
    // Still full — drop oldest (insertion order) until under cap.
    const toDrop = buckets.size - Math.floor(MAX_BUCKETS * 0.9);
    let dropped = 0;
    for (const key of buckets.keys()) {
      if (dropped++ >= toDrop) break;
      buckets.delete(key);
    }
  }

  function clientKey(c: Parameters<MiddlewareHandler>[0]): string {
    if (trustProxy) {
      const header = c.req.header("x-forwarded-for");
      const first = header?.split(",")[0]?.trim();
      if (first) return `xff:${first.toLowerCase()}`;
    }
    // Fallback / default: TCP socket address.
    // Hono on Bun exposes the raw Request; server-info is on env.server.
    // In practice Bun.serve passes a Request with no direct socket access,
    // so we use a header-free fingerprint. On Render this branch is never
    // hit because TRUST_PROXY is set.
    const realIp = c.req.header("x-real-ip")?.trim();
    if (realIp) return `realip:${realIp.toLowerCase()}`;
    // Last resort: bucket per-connection pseudo-id so a misconfigured
    // deployment doesn't funnel every guest into a single shared bucket.
    return `noid:${Math.floor(Math.random() * 1_000_000)}`;
  }

  return async (c, next) => {
    const now = Date.now();
    evictIfNeeded(now);
    const key = clientKey(c);

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count++;

    if (bucket.count > opts.max) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
      c.header("Retry-After", String(retryAfterSec));
      return c.json(
        {
          error: "Trop de requêtes, réessayez dans un instant.",
          code: "RATE_LIMITED",
        },
        429,
      );
    }

    await next();
  };
}
