import { NextRequest, NextResponse } from "next/server";
import { getDebateById } from "@/lib/db/debates";
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

    const debate = await getDebateById(user.id, id);

    if (!debate) {
      return NextResponse.json(
        {
          error: "Debate not found.",
          code: "DEBATE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ...debate,
        objections: Array.isArray(debate.objections) ? debate.objections : [],
        replies: Array.isArray(debate.replies) ? debate.replies : [],
        sources: Array.isArray(debate.sources) ? debate.sources : [],
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Debate detail route error", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        error: "Failed to fetch debate record.",
        code: "DEBATE_FETCH_ERROR",
      },
      { status: 500 },
    );
  }
}
