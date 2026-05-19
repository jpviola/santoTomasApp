import { prisma } from "@/lib/db/prisma";
import { DatabaseError } from "@/lib/utils/errors";

function formatDbInitHint() {
  return "Database is not ready. Run: npx prisma db push";
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : null;
  const message = typeof record.message === "string" ? record.message : "";
  const normalized = message.toLowerCase();
  return (
    code === "P2021" ||
    normalized.includes("no such table") ||
    normalized.includes("does not exist") ||
    normalized.includes("environment variable not found: database_url")
  );
}

const DEFAULT_USER_ID = "legacy";

type SaveDebateParams = {
  question: string;
  userId?: string;
  audience?: string;
  context?: string;
  objections: unknown;
  sedContra: string;
  respondeo: string;
  replies: unknown;
  application: string;
  sources: unknown;
  generatedAt: string;
};

function sanitizeJson(value: unknown): object {
  return JSON.parse(JSON.stringify(value)) as object;
}

export async function saveDebate({ question, userId, audience, context, ...result }: SaveDebateParams) {
  try {
    return await prisma.debate.create({
      data: {
        userId: userId ?? DEFAULT_USER_ID,
        question,
        audience: audience ?? "graduate",
        context,
        objections: sanitizeJson(result.objections),
        sedContra: result.sedContra,
        respondeo: result.respondeo,
        replies: sanitizeJson(result.replies),
        application: result.application,
        sources: sanitizeJson(result.sources),
        generatedAt: result.generatedAt,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = error && typeof error === 'object' && 'code' in error ? (error as Record<string, unknown>).code : 'N/A';
    console.error("[saveDebate] Database error:", { code: errCode, message: errMsg, fullError: JSON.stringify(error, null, 2) });
    throw new DatabaseError(`Failed to save debate: [${errCode}] ${errMsg}`, { cause: error });
  }
}

export async function listDebates(limit = 30, userId?: string) {
  try {
    return await prisma.debate.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      where: userId ? { userId } : undefined,
      select: {
        id: true,
        question: true,
        audience: true,
        context: true,
        createdAt: true,
        generatedAt: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to list debates.", { cause: error });
  }
}

export async function getDebateById(id: string) {
  try {
    return await prisma.debate.findUnique({ where: { id } });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to fetch debate.", { cause: error });
  }
}

export async function deleteDebate(id: string) {
  try {
    return await prisma.debate.delete({ where: { id } });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to delete debate.", { cause: error });
  }
}
