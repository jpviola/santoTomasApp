import { NextResponse } from "next/server";
import { runDebate } from "@/lib/orchestrator/runDebate";
import { parseDebateInput } from "@/lib/schemas/debate";
import { saveDebate } from "@/lib/db/debates";
import { CreateTaskResponseSchema } from "@/lib/schemas/task";
import { taskStore } from "@/lib/task-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const taskId = crypto.randomUUID();

    taskStore.set(taskId, {
      id: taskId,
      status: "PENDING",
      progress: 0,
      message: "start",
      error: null,
      recordId: null,
    });

    (async () => {
      try {
        const update = (data: Partial<{
          status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
          progress: number;
          message: string;
          error: string | null;
          recordId: string | null;
          result?: unknown;
        }>) => {
          const current = taskStore.get(taskId) ?? {
            id: taskId, status: "PENDING" as const, progress: 0, message: "start", error: null, recordId: null,
          };
          taskStore.set(taskId, { ...current, ...data });
        };

        update({ status: "PROCESSING", progress: 10, message: "moderate_and_retrieve" });
        const parsed = parseDebateInput({ ...body, audience: "graduate" });

        const result = await runDebate(parsed, {
          onProgress: (u) => update({ progress: u.progress, message: u.stage }),
        });

        update({ progress: 90, message: "finalize" });
        const saved = await saveDebate({
          question: parsed.question,
          audience: "graduate",
          context: parsed.context,
          objections: result.objections,
          sedContra: result.sedContra,
          respondeo: result.respondeo,
          replies: result.replies,
          application: result.application,
          sources: result.sources,
          generatedAt: result.metadata.generatedAt,
        });

        update({
          status: "COMPLETED",
          progress: 100,
          message: "done",
          recordId: saved.id,
          result: { ...result, recordId: saved.id },
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Background task error:", err);
        const current = taskStore.get(taskId) ?? {
          id: taskId, status: "PENDING" as const, progress: 0, message: "start", error: null, recordId: null,
        };
        taskStore.set(taskId, { ...current, status: "FAILED" as const, error: errorMessage });
      }
    })();

    return NextResponse.json(CreateTaskResponseSchema.parse({ taskId }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
