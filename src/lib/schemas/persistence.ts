import { z } from "zod";

export const DebateHistoryItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  audience: z.string(),
  context: z.string().nullable(),
  createdAt: z.date(),
  generatedAt: z.date(),
});

export const DebateRecordSchema = z.object({
  id: z.string(),
  question: z.string(),
  audience: z.string(),
  context: z.string().nullable(),
  objections: z.unknown(),
  sedContra: z.string(),
  respondeo: z.string(),
  replies: z.unknown(),
  application: z.string(),
  sources: z.unknown(),
  generatedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
