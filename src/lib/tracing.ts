const ENABLED = process.env.NEXT_PUBLIC_OTEL_ENABLED === "true";

export function startSpan(name: string, attributes?: Record<string, string | number | boolean>) {
  const startTime = Date.now();
  if (ENABLED && attributes) {
    console.log(`[tracing] start ${name}`, attributes);
  }
  return { name, startTime };
}

export function endSpan(
  span: { name: string; startTime: number } | null,
  attributes?: Record<string, string | number | boolean>,
  status: "ok" | "error" = "ok"
) {
  if (!span) return;
  const duration = Date.now() - span.startTime;
  if (ENABLED) {
    console.log(`[tracing] ${span.name} ${status === "ok" ? "completed" : "failed"} in ${duration}ms`, attributes ?? {});
  }
}

export async function runWithSpan<T>(
  name: string,
  fn: (span: { name: string; startTime: number } | null) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const span = ENABLED ? startSpan(name, attributes) : null;
  const startTime = Date.now();

  try {
    const result = await fn(span);
    if (span) {
      endSpan(span, { durationMs: Date.now() - startTime }, "ok");
    }
    if (ENABLED) {
      console.log(`[tracing] ${name} completed in ${Date.now() - startTime}ms`);
    }
    return result;
  } catch (error) {
    if (span) {
      endSpan(span, { durationMs: Date.now() - startTime, error: String(error) }, "error");
    }
    if (ENABLED) {
      console.log(`[tracing] ${name} failed after ${Date.now() - startTime}ms:`, error);
    }
    throw error;
  }
}

export function recordMetric(name: string, value: number, unit?: string) {
  if (!ENABLED) return;
  console.log(`[metrics] ${name}=${value}${unit ? ` ${unit}` : ""}`);
}

export const TracingConfig = {
  enabled: ENABLED,
};