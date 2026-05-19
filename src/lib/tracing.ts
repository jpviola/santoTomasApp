import { trace, SpanStatusCode, context } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "stotomas-ai",
    [ATTR_SERVICE_VERSION]: "0.1.0",
  }),
});

const ENABLED = process.env.NEXT_PUBLIC_OTEL_ENABLED === "true";
const TRACER_NAME = "stotomas-debate-pipeline";

let tracer: ReturnType<typeof trace.getTracer> | null = null;

function getTracer() {
  if (!tracer && ENABLED) {
    try {
      sdk.start();
      tracer = trace.getTracer(TRACER_NAME);
    } catch (error) {
      console.warn("[tracing] Failed to start OpenTelemetry:", error);
    }
  }
  return tracer;
}

export function startSpan(name: string, attributes?: Record<string, string | number | boolean>) {
  const t = getTracer();
  if (!t) {
    return null;
  }
  return t.startSpan(name, undefined, context.active());
}

export function endSpan(span: ReturnType<typeof startSpan>, attributes?: Record<string, string | number | boolean>, status: SpanStatusCode = SpanStatusCode.OK) {
  if (!span) return;
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
  }
  span.setStatus({ code: status });
  span.end();
}

export async function runWithSpan<T>(
  name: string,
  fn: (span: ReturnType<typeof startSpan>) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const span = startSpan(name, attributes);
  const startTime = Date.now();

  try {
    const result = await fn(span);
    if (span) {
      endSpan(span, { durationMs: Date.now() - startTime }, SpanStatusCode.OK);
    }
    console.log(`[tracing] ${name} completed in ${Date.now() - startTime}ms`);
    return result;
  } catch (error) {
    if (span) {
      endSpan(span, { durationMs: Date.now() - startTime, error: String(error) }, SpanStatusCode.ERROR);
    }
    console.log(`[tracing] ${name} failed after ${Date.now() - startTime}ms:`, error);
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