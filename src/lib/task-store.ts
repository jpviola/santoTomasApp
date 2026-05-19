type DebateTaskState = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  message: string;
  error: string | null;
  recordId: string | null;
  result?: unknown;
  createdAt: number;
};

const TASK_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TASKS = 500;

const globalForTaskStore = globalThis as unknown as { taskStore?: Map<string, DebateTaskState>; cleanupTimer?: ReturnType<typeof setInterval> };

const taskStoreMap = globalForTaskStore.taskStore ?? new Map<string, DebateTaskState>();
globalForTaskStore.taskStore = taskStoreMap;

function cleanupExpiredTasks() {
  const now = Date.now();
  for (const [key, task] of taskStoreMap.entries()) {
    const age = now - task.createdAt;
    const isTerminal = task.status === "COMPLETED" || task.status === "FAILED";
    if ((isTerminal && age > TASK_TTL_MS) || age > TASK_TTL_MS * 2) {
      taskStoreMap.delete(key);
    }
  }
}

function enforceMaxSize() {
  if (taskStoreMap.size <= MAX_TASKS) return;

  const entries = Array.from(taskStoreMap.entries()).sort(
    (a, b) => a[1].createdAt - b[1].createdAt
  );

  const toRemove = entries.slice(0, entries.length - MAX_TASKS);
  for (const [key] of toRemove) {
    taskStoreMap.delete(key);
  }
}

if (process.env.NODE_ENV !== "production" || !globalForTaskStore.cleanupTimer) {
  if (globalForTaskStore.cleanupTimer) {
    clearInterval(globalForTaskStore.cleanupTimer);
  }
  globalForTaskStore.cleanupTimer = setInterval(() => {
    cleanupExpiredTasks();
    enforceMaxSize();
  }, CLEANUP_INTERVAL_MS);
}

export const taskStore = {
  get(key: string): DebateTaskState | undefined {
    return taskStoreMap.get(key);
  },
  set(key: string, value: Omit<DebateTaskState, "createdAt">): DebateTaskState {
    const entry: DebateTaskState = { ...value, createdAt: Date.now() };
    taskStoreMap.set(key, entry);
    return entry;
  },
  delete(key: string): boolean {
    return taskStoreMap.delete(key);
  },
  has(key: string): boolean {
    return taskStoreMap.has(key);
  },
  get size(): number {
    return taskStoreMap.size;
  },
  cleanupNow(): void {
    cleanupExpiredTasks();
    enforceMaxSize();
  },
};
