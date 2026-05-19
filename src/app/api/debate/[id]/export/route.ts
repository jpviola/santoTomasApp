import { NextRequest, NextResponse } from "next/server";
import { getDebateById } from "@/lib/db/debates";
import { buildDebateMarkdown } from "@/lib/export/markdown";
import { logger } from "@/lib/utils/logger";
import { ExportOverridesSchema } from "@/lib/schemas/export";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const getRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getString = (obj: Record<string, unknown> | null, key: string): string | undefined => {
  const value = obj?.[key];
  return typeof value === "string" ? value : undefined;
};

const getStringArray = (obj: Record<string, unknown> | null, key: string): string[] | undefined => {
  const value = obj?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value.filter((v): v is string => typeof v === "string");
  return strings.length > 0 ? strings : [];
};

const exportFromDb = async (id: string, overrides?: unknown) => {
  const overrideObj = getRecord(overrides);
  const parsedOverrides = ExportOverridesSchema.parse({
    course: getString(overrideObj, "course"),
    module: getString(overrideObj, "module"),
    topic: getString(overrideObj, "topic"),
    status: getString(overrideObj, "status"),
    archivePath: getString(overrideObj, "archivePath"),
    customTags: getStringArray(overrideObj, "customTags"),
  });

  const debate = await getDebateById(id);
  if (!debate) {
    return {
      status: 404,
      json: {
        error: "Debate not found.",
        code: "DEBATE_NOT_FOUND",
      },
    } as const;
  }

  const { filename, content } = buildDebateMarkdown(
    {
      id: debate.id,
      question: debate.question,
      audience: debate.audience,
      context: debate.context,
      objections: Array.isArray(debate.objections) ? (debate.objections as string[]) : [],
      sedContra: debate.sedContra,
      respondeo: debate.respondeo,
      replies: Array.isArray(debate.replies) ? (debate.replies as string[]) : [],
      application: debate.application,
      sources: Array.isArray(debate.sources)
        ? (debate.sources as Array<{ id: string; title: string; citation: string; text: string }>)
        : [],
      generatedAt: debate.generatedAt,
      createdAt: debate.createdAt,
    },
    parsedOverrides,
  );

  return {
    status: 200,
    markdown: {
      filename,
      content,
    },
  } as const;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const exported = await exportFromDb(id, body);

    if ("json" in exported) {
      return NextResponse.json(exported.json, { status: exported.status });
    }

    return new NextResponse(exported.markdown.content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exported.markdown.filename}"`,
      },
    });
  } catch (error) {
    logger.error("Debate export route error", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        error: "Failed to export debate.",
        code: "DEBATE_EXPORT_ERROR",
      },
      { status: 500 },
    );
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const exported = await exportFromDb(id, {});

    if ("json" in exported) {
      return NextResponse.json(exported.json, { status: exported.status });
    }

    return new NextResponse(exported.markdown.content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exported.markdown.filename}"`,
      },
    });
  } catch (error) {
    logger.error("Debate export route error", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        error: "Failed to export debate.",
        code: "DEBATE_EXPORT_ERROR",
      },
      { status: 500 },
    );
  }
}
