import { NextResponse } from "next/server";
import { listDebates } from "@/lib/db/debates";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit, getClientKey, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const clientKey = getClientKey(request);
  const rateCheck = checkRateLimit(clientKey, RATE_LIMITS.history);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  try {
    const debates = await listDebates(30);

    return NextResponse.json(
      { items: debates },
      { status: 200 },
    );
  } catch (error) {
    if (isAppError(error) && error.code === "DATABASE_ERROR") {
      logger.warn("Debate history route database not ready", {
        errorMessage: error.message,
        errorName: error.name,
      });

      return NextResponse.json(
        { items: [], warning: error.message, code: "DATABASE_NOT_READY" },
        { status: 200 },
      );
    }

    logger.error("Debate history route error", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { error: "Failed to fetch debate history.", code: "HISTORY_FETCH_ERROR" },
      { status: 500 },
    );
  }
}
