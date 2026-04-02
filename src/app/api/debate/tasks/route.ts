import { NextRequest, NextResponse } from "next/server";
import { parseDebateInput } from "@/lib/schemas/debate";
import { createDebateTask, updateDebateTask } from "@/lib/db/debates";
import { runDebate } from "@/lib/orchestrator/runDebate";
import { saveDebate } from "@/lib/db/debates";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function runDebateTask(taskId: string, parsed: ReturnType<typeof parseDebateInput>) {
  try {
    await updateDebateTask(taskId, { status: "PROCESSING", progress: 1, message: "start", error: null });

    const result = await runDebate(parsed, {
      onProgress: async (update) => {
        await updateDebateTask(taskId, {
          status: "PROCESSING",
          progress: clampPercent(update.progress),
          message: update.stage,
        });
      },
    });

    const saved = await saveDebate({
      question: parsed.question,
      audience: parsed.audience,
      context: parsed.context,
      result,
    });

    await updateDebateTask(taskId, {
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

    await updateDebateTask(taskId, {
      status: "FAILED",
      progress: 100,
      message: "failed",
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => null);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseDebateInput(body);

    const task = await createDebateTask({
      question: parsed.question,
      audience: parsed.audience,
      context: parsed.context,
    });

    void runDebateTask(task.id, parsed);

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

