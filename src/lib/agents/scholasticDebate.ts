import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { buildDebateSystemPrompt, buildDebateUserPrompt } from "@/lib/prompts/debatePrompt";
import { getEnv } from "@/lib/config/env";
import {
  ObjectionsOutputSchema,
  RepliesOutputSchema,
  RespondeoOutputSchema,
  SedContraOutputSchema,
  type Audience,
  type SourceSnippet,
} from "@/lib/schemas/debate";
import { JsonExtractionError, JsonParseError, ModelResponseValidationError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { withRetry } from "@/lib/llm/withRetry";
import { z } from "zod";

const ScholasticDebateOutputSchema = z
  .object({
    objections: ObjectionsOutputSchema.shape.objections,
    sedContra: SedContraOutputSchema.shape.sedContra,
    respondeo: RespondeoOutputSchema.shape.respondeo,
    replies: RepliesOutputSchema.shape.replies,
    application: RespondeoOutputSchema.shape.application,
  })
  .strip()
  .refine((value) => value.replies.length === value.objections.length, {
    message: "There must be exactly one reply per objection.",
    path: ["replies"],
  });

export type ScholasticDebateOutput = z.infer<typeof ScholasticDebateOutputSchema>;

type RunScholasticDebateParams = {
  question: string;
  audience: Audience;
  context?: string;
  framing?: string;
  precisionNotes?: string[];
  sources: SourceSnippet[];
  ontologyTerms: string[];
  language?: "en" | "es" | "la";
};

export async function runScholasticDebate({
  question,
  audience,
  context,
  framing,
  precisionNotes,
  sources,
  ontologyTerms,
  language = "en",
}: RunScholasticDebateParams): Promise<ScholasticDebateOutput> {
  const systemPrompt = buildDebateSystemPrompt(language);
  const userPrompt = buildDebateUserPrompt({
    question,
    audience,
    language,
    context,
    framing,
    precisionNotes,
    ontologyTerms,
    sources,
  });

  return withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        operationName: "scholastic-debate-agent-model-call",
        maxTokens: getEnv().DEBATE_MAX_TOKENS,
      });

      logger.debug("Scholastic debate raw response received", {
        responsePreview: raw.slice(0, 500),
      });

      return parseJsonWithSchema(raw, ScholasticDebateOutputSchema);
    },
    {
      operationName: "scholastic-debate-agent-parse-cycle",
      maxAttempts: 3,
      initialDelayMs: 300,
      backoffMultiplier: 2,
      shouldRetry: (error) =>
        error instanceof JsonExtractionError ||
        error instanceof JsonParseError ||
        error instanceof ModelResponseValidationError,
    },
  );
}
