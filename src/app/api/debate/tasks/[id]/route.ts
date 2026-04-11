import { NextRequest, NextResponse } from "next/server";
import { getDebateTaskById } from "@/lib/db/debates";
import { logger } from "@/lib/utils/logger";
import { getUserFromRequest } from "@/lib/auth/requireUser";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    const task = await getDebateTaskById(user.id, id);

    if (!task) {
      return NextResponse.json(
        {
          error: "Task not found.",
          code: "TASK_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    logger.error("Debate task status route error", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        error: "Failed to fetch task status.",
        code: "TASK_FETCH_ERROR",
      },
      { status: 500 },
    );
  }
}

