import { z } from "zod";

export const AudienceSchema = z.enum(["undergraduate", "graduate", "seminary"]);

export const DebateInputSchema = z
  .object({
    question: z.string().min(5, "Question must be at least 5 characters."),
    audience: AudienceSchema.optional().default("graduate"),
    context: z.string().optional(),
    language: z.enum(["en", "es", "la"]).optional().default("es"),
  })
  .strip();

export const SourceSnippetSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    citation: z.string(),
    text: z.string(),
    url: z.string().url().optional(),
  })
  .strip();

export const ModeratorOutputSchema = z
  .object({
    question: z.string(),
    framing: z.string(),
    precisionNotes: z.array(z.string()).default([]),
  })
  .strip();

export const ObjectionsOutputSchema = z
  .object({
    objections: z.array(z.string()).min(1).max(5),
  })
  .strip();

export const SedContraOutputSchema = z
  .object({
    sedContra: z.string(),
  })
  .strip();

export const RespondeoOutputSchema = z
  .object({
    respondeo: z.string(),
    application: z.string(),
  })
  .strip();

export const RepliesOutputSchema = z
  .object({
    replies: z.array(z.string()).min(1).max(5),
  })
  .strip();

export const DebateOutputSchema = z
  .object({
    question: z.string(),
    objections: z.array(z.string()),
    sedContra: z.string(),
    respondeo: z.string(),
    replies: z.array(z.string()),
    application: z.string(),
    sources: z.array(SourceSnippetSchema),
    metadata: z.object({
      audience: AudienceSchema,
      generatedAt: z.string(),
    }),
    recordId: z.string().optional(),
  })
  .strip();

export type Audience = z.infer<typeof AudienceSchema>;
export type DebateInput = z.infer<typeof DebateInputSchema>;
export type SourceSnippet = z.infer<typeof SourceSnippetSchema>;
export type ModeratorOutput = z.infer<typeof ModeratorOutputSchema>;
export type ObjectionsOutput = z.infer<typeof ObjectionsOutputSchema>;
export type SedContraOutput = z.infer<typeof SedContraOutputSchema>;
export type RespondeoOutput = z.infer<typeof RespondeoOutputSchema>;
export type RepliesOutput = z.infer<typeof RepliesOutputSchema>;
export type DebateOutput = z.infer<typeof DebateOutputSchema>;

export const parseDebateInput = (body: unknown): DebateInput => {
  const obj =
    typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

  const normalized =
    obj && typeof obj.question !== "string" && typeof obj.topic === "string" ? { ...obj, question: obj.topic } : body;

  const parsed = DebateInputSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  }
  return parsed.data;
};
