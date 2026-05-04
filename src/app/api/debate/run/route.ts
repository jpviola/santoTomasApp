import { NextResponse } from "next/server";
import { runDebate } from "@/lib/orchestrator/runDebate";
import { parseDebateInput } from "@/lib/schemas/debate";
import { saveDebate } from "@/lib/db/debates";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseDebateInput({ ...body, audience: "graduate" });
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
