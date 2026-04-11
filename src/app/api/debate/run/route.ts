import { NextRequest, NextResponse } from "next/server";
import { runDebate } from "@/lib/orchestrator/runDebate";
import { parseDebateInput } from "@/lib/schemas/debate";
import { saveDebate } from "@/lib/db/debates";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { getUserFromRequest } from "@/lib/auth/requireUser";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = parseDebateInput(body);
    const result = await runDebate(parsed);

    const saved = await saveDebate(user.id, {
      question: parsed.question,
      audience: parsed.audience,
      context: parsed.context,
      result,
    });

    return NextResponse.json({ ...result, recordId: saved.id }, { status: 200 });
  } catch (err) {
    logger.error("Debate route error", {
      errorMessage: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : "UnknownError",
      errorDetails: isAppError(err) ? err.details : undefined,
      errorCode: isAppError(err) ? err.code : undefined,
    });

    if (isAppError(err)) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          details: err.details ?? null,
        },
        { status: err.statusCode },
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected server error.",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
