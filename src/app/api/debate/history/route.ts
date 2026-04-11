import { NextRequest, NextResponse } from "next/server";
import { listDebates } from "@/lib/db/debates";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { getUserFromRequest } from "@/lib/auth/requireUser";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          items: [],
          warning: "Inicia sesión para ver tus debates recientes.",
          code: "AUTH_REQUIRED",
        },
        { status: 200 },
      );
    }

    const debates = await listDebates(user.id, 20);

    return NextResponse.json(
      {
        items: debates,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isAppError(error) && error.code === "DATABASE_ERROR") {
      logger.warn("Debate history route database not ready", {
        errorMessage: error.message,
        errorName: error.name,
      });

      return NextResponse.json(
        {
          items: [],
          warning: error.message,
          code: "DATABASE_NOT_READY",
        },
        { status: 200 },
      );
    }

    logger.error("Debate history route error", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        error: "Failed to fetch debate history.",
        code: "HISTORY_FETCH_ERROR",
      },
      { status: 500 },
    );
  }
}
