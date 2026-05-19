import { NextResponse } from "next/server";
import { getDebateById } from "@/lib/db/debates";
import { logger } from "@/lib/utils/logger";

function parseJsonField(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" || Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

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
        id: debate.id,
        userId: debate.userId,
        question: debate.question,
        audience: debate.audience,
        context: debate.context,
        objections: parseJsonField(debate.objections) ?? [],
        sedContra: debate.sedContra,
        respondeo: debate.respondeo,
        replies: parseJsonField(debate.replies) ?? [],
        application: debate.application,
        sources: parseJsonField(debate.sources) ?? [],
        generatedAt: debate.generatedAt,
        createdAt: debate.createdAt,
        updatedAt: debate.updatedAt,
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
