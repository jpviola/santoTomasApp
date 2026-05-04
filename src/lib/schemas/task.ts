import { z } from "zod";

/**
 * Esquema para la respuesta de la creación de una tarea de debate.
 * POST /api/debate/tasks
 */
export const CreateTaskResponseSchema = z.object({
  taskId: z.string(),
});

export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;

/**
 * Esquema para el estado de una tarea de debate.
 * GET /api/debate/tasks/{taskId}
 */
export const DebateTaskStatusSchema = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);

export const DebateTaskSchema = z.object({
  id: z.string(),
  status: DebateTaskStatusSchema,
  progress: z.number().min(0).max(100),
  message: z.string().nullable(),
  error: z.string().nullable(),
  recordId: z.string().nullable(),
});

export type DebateTask = z.infer<typeof DebateTaskSchema>;