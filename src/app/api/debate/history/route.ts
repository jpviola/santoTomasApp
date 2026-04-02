import { NextResponse } from "next/server";
import { listDebates } from "@/lib/db/debates";
import { logger } from "@/lib/utils/logger";

export async function GET() {
  try {
    const debates = await listDebates(20);

    return NextResponse.json(
      {
        items: debates,
      },
      { status: 200 },
    );
  } catch (error) {
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
