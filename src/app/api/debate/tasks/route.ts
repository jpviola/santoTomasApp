import { NextRequest, NextResponse } from "next/server";
import { parseDebateInput } from "@/lib/schemas/debate";
import { createDebateTask, updateDebateTask } from "@/lib/db/debates";
import { runDebate } from "@/lib/orchestrator/runDebate";
import { saveDebate } from "@/lib/db/debates";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { getUserFromRequest } from "@/lib/auth/requireUser";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

type ParsedWithUser = ReturnType<typeof parseDebateInput> & { userId: string };

async function runDebateTask(taskId: string, parsed: ParsedWithUser) {
  try {
    await updateDebateTask(parsed.userId, taskId, { status: "PROCESSING", progress: 1, message: "start", error: null });

    const result = await runDebate(parsed, {
      onProgress: async (update) => {
        await updateDebateTask(parsed.userId, taskId, {
          status: "PROCESSING",
          progress: clampPercent(update.progress),
          message: update.stage,
        });
      },
    });

    const saved = await saveDebate(parsed.userId, {
      question: parsed.question,
      audience: parsed.audience,
      context: parsed.context,
      result,
    });

    await updateDebateTask(parsed.userId, taskId, {
      status: "COMPLETED",
      progress: 100,
      message: "done",
      recordId: saved.id,
      error: null,
    });
  } catch (err) {
    logger.error("Debate task execution error", {
      taskId,
      errorMessage: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : "UnknownError",
      errorDetails: isAppError(err) ? err.details : undefined,
      errorCode: isAppError(err) ? err.code : undefined,
    });

    await updateDebateTask(parsed.userId, taskId, {
      status: "FAILED",
      progress: 100,
      message: "failed",
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => null);
  }
}

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
    const parsedWithUser: ParsedWithUser = { ...parsed, userId: user.id };

    const task = await createDebateTask(user.id, {
      question: parsed.question,
      audience: parsed.audience,
      context: parsed.context,
    });

    void runDebateTask(task.id, parsedWithUser);

    return NextResponse.json({ taskId: task.id }, { status: 202 });
  } catch (err) {
    logger.error("Debate task create route error", {
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

