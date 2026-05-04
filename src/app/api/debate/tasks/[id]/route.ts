import { NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";
import { DebateTaskSchema } from "@/lib/schemas/task";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = taskStore.get(id);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const validated = DebateTaskSchema.parse(task);
  return NextResponse.json(validated);
}
