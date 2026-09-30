import { z } from "zod";

export const TUTOR_MAX_MESSAGES = 24;
export const TUTOR_MAX_MESSAGE_CHARS = 2000;

export const TutorRequestSchema = z
  .object({
    lessonId: z.string().min(1).max(64),
    language: z.enum(["es", "en"]).default("es"),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(TUTOR_MAX_MESSAGE_CHARS),
        }),
      )
      .min(1)
      .max(TUTOR_MAX_MESSAGES)
      .refine((messages) => messages[messages.length - 1]?.role === "user", {
        message: "The last message must come from the student.",
      }),
  })
  .strip();

export type TutorRequest = z.infer<typeof TutorRequestSchema>;
