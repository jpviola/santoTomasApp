import { NextResponse } from "next/server";
import { getDebateById } from "@/lib/db/debates";
import { logger } from "@/lib/utils/logger";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const debate = await getDebateById(id);

    if (!debate) {
      return NextResponse.json(
        { error: "Debate not found.", code: "DEBATE_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ...debate,
        objections: JSON.parse(debate.objections as string) ?? [],
        replies: JSON.parse(debate.replies as string) ?? [],
        sources: JSON.parse(debate.sources as string) ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Debate detail route error", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { error: "Failed to fetch debate record.", code: "DEBATE_FETCH_ERROR" },
      { status: 500 },
    );
  }
}
