import { NextResponse } from "next/server";
import { findLesson } from "@/lib/learning/curriculum";
import { streamChat } from "@/lib/llm/streamChat";
import { buildTutorSystemPrompt } from "@/lib/prompts/tutorPrompt";
import { checkRateLimit, getClientKey, RATE_LIMITS } from "@/lib/rate-limit";
import { TutorRequestSchema } from "@/lib/schemas/tutor";
import { logger } from "@/lib/utils/logger";

export const maxDuration = 60;

export async function POST(req: Request) {
  const rateCheck = await checkRateLimit(getClientKey(req, "tutor"), RATE_LIMITS.tutor);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", code: "RATE_LIMITED", retryAfter: Math.ceil(rateCheck.resetIn / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = TutorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" "), code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { lessonId, language, messages } = parsed.data;
  const location = findLesson(lessonId, language);
  if (!location) {
    return NextResponse.json({ error: "Lesson not found.", code: "LESSON_NOT_FOUND" }, { status: 404 });
  }

  const chunks = streamChat({
    systemPrompt: buildTutorSystemPrompt(location, language),
    messages,
    temperature: 0.5,
    maxTokens: 900,
    operationName: "learn-tutor",
  });

  // Se espera el primer fragmento antes de responder: así un fallo del proveedor
  // llega como error HTTP y no como un stream vacío.
  let first: IteratorResult<string>;
  try {
    first = await chunks.next();
  } catch (error) {
    logger.error("Tutor request failed", {
      lessonId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "The tutor is not available right now.", code: "LLM_PROVIDER_ERROR" },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value));
        for (let next = await chunks.next(); !next.done; next = await chunks.next()) {
          controller.enqueue(encoder.encode(next.value));
        }
      } catch (error) {
        logger.error("Tutor stream interrupted", {
          lessonId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
