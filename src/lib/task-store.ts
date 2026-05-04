type DebateTaskState = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  message: string;
  error: string | null;
  recordId: string | null;
  result?: unknown;
};

const globalForTaskStore = globalThis as unknown as { taskStore?: Map<string, DebateTaskState> };
export const taskStore = globalForTaskStore.taskStore ?? new Map<string, DebateTaskState>();
if (process.env.NODE_ENV !== "production") globalForTaskStore.taskStore = taskStore;
