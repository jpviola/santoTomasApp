import { prisma } from "@/lib/db/prisma";
import type { DebateOutput } from "@/lib/schemas/debate";
import { DatabaseError } from "@/lib/utils/errors";

function formatDbInitHint() {
  return "Database is not ready. Run: npx prisma migrate dev && npx prisma generate";
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : null;
  const message = typeof record.message === "string" ? record.message : "";
  return code === "P2021" || message.toLowerCase().includes("no such table") || message.toLowerCase().includes("does not exist");
}

type SaveDebateParams = {
  question: string;
  audience: "undergraduate" | "graduate" | "seminary";
  context?: string;
  result: DebateOutput;
};

export async function saveDebate({ question, audience, context, result }: SaveDebateParams) {
  try {
    return await prisma.debate.create({
      data: {
        question,
        audience,
        context,
        objections: result.objections,
        sedContra: result.sedContra,
        respondeo: result.respondeo,
        replies: result.replies,
        application: result.application,
        sources: result.sources,
        generatedAt: new Date(result.metadata.generatedAt),
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to save debate.", { cause: error });
  }
}

export async function listDebates(limit = 20) {
  try {
    return await prisma.debate.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
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
    return await prisma.debate.findUnique({
      where: { id },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to fetch debate.", { cause: error });
  }
}

type CreateDebateTaskParams = {
  question: string;
  audience: "undergraduate" | "graduate" | "seminary";
  context?: string;
};

type UpdateDebateTaskParams = {
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress?: number;
  message?: string | null;
  error?: string | null;
  recordId?: string | null;
};

export async function createDebateTask({ question, audience, context }: CreateDebateTaskParams) {
  try {
    return await prisma.debateTask.create({
      data: {
        status: "PENDING",
        progress: 0,
        message: "Queued",
        question,
        audience,
        context,
      },
      select: {
        id: true,
        status: true,
        progress: true,
        message: true,
        error: true,
        recordId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to create debate task.", { cause: error });
  }
}

export async function updateDebateTask(id: string, update: UpdateDebateTaskParams) {
  try {
    return await prisma.debateTask.update({
      where: { id },
      data: {
        status: update.status,
        progress: update.progress,
        message: update.message === undefined ? undefined : update.message,
        error: update.error === undefined ? undefined : update.error,
        recordId: update.recordId === undefined ? undefined : update.recordId,
      },
      select: {
        id: true,
        status: true,
        progress: true,
        message: true,
        error: true,
        recordId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to update debate task.", { cause: error });
  }
}

export async function getDebateTaskById(id: string) {
  try {
    return await prisma.debateTask.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        progress: true,
        message: true,
        error: true,
        recordId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new DatabaseError(formatDbInitHint(), { cause: error });
    }
    throw new DatabaseError("Failed to fetch debate task.", { cause: error });
  }
}
