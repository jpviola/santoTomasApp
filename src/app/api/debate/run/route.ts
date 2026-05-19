import { NextResponse } from "next/server";
import { runDebate } from "@/lib/orchestrator/runDebate";
import { parseDebateInput } from "@/lib/schemas/debate";
import { saveDebate } from "@/lib/db/debates";
import { isAppError, DatabaseError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit, getClientKey, RATE_LIMITS } from "@/lib/rate-limit";
import { assertQuestionInScope } from "@/lib/guardrails/questionScope";

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const rateCheck = checkRateLimit(clientKey, RATE_LIMITS.debate);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", code: "RATE_LIMITED", retryAfter: Math.ceil(rateCheck.resetIn / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = parseDebateInput({ ...body, audience: "graduate" });
    assertQuestionInScope(parsed.question, parsed.language);
    const result = await runDebate(parsed);

    const saved = await saveDebate({
      question: parsed.question,
      audience: "graduate",
      context: parsed.context,
      objections: result.objections,
      sedContra: result.sedContra,
      respondeo: result.respondeo,
      replies: result.replies,
      application: result.application,
      sources: result.sources,
      generatedAt: result.metadata.generatedAt,
    });

    if (!saved) {
      throw new DatabaseError("Debate generated but could not be retrieved after saving.");
    }

    return NextResponse.json({ ...result, recordId: saved.id }, { status: 200 });
  } catch (err) {
    logger.error("Debate route error", {
      errorMessage: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : "UnknownError",
    });

    if (isAppError(err)) {
      return NextResponse.json(
        { error: err.message, code: err.code, details: err.details ?? null },
        { status: err.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unexpected server error.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
