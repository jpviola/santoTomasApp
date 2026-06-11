import { logger } from "@/lib/utils/logger";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetIn: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

function cleanupStore() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

setInterval(cleanupStore, 60 * 1000);

function checkRateLimitInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  store.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  };
}

type UpstashPipelineResponse = Array<{ result?: unknown; error?: string }>;

async function checkRateLimitUpstash(
  baseUrl: string,
  token: string,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const response = await fetch(`${baseUrl}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, config.windowMs, "NX"],
      ["PTTL", key],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed with status ${response.status}`);
  }

  const results = (await response.json()) as UpstashPipelineResponse;
  const failed = results.find((r) => r.error);
  if (failed) {
    throw new Error(`Upstash pipeline error: ${failed.error}`);
  }

  const count = Number(results[0]?.result ?? 0);
  const ttl = Number(results[2]?.result ?? config.windowMs);
  const resetIn = ttl > 0 ? ttl : config.windowMs;

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetIn,
  };
}

/**
 * Distributed rate limit via Upstash Redis (REST) when UPSTASH_REDIS_REST_URL
 * and UPSTASH_REDIS_REST_TOKEN are set; otherwise per-instance in-memory Map.
 * On Upstash errors it falls back to the in-memory limiter instead of blocking traffic.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (baseUrl && token) {
    try {
      return await checkRateLimitUpstash(baseUrl.replace(/\/$/, ""), token, key, config);
    } catch (error) {
      logger.warn("Upstash rate limit failed, falling back to in-memory", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return checkRateLimitInMemory(key, config);
}

export type RateLimitScope = keyof typeof RATE_LIMITS;

export function getClientKey(request: Request, scope: RateLimitScope): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ratelimit:${scope}:${ip}`;
}

export const RATE_LIMITS = {
  debateStream: { windowMs: 60 * 1000, maxRequests: 3 },
  history: { windowMs: 60 * 1000, maxRequests: 30 },
  export: { windowMs: 60 * 1000, maxRequests: 10 },
} as const;
