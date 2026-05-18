import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { sharedThomisticRules } from "@/lib/prompts/sharedRules";
import {
  ObjectionsOutputSchema,
  RepliesOutputSchema,
  RespondeoOutputSchema,
  SedContraOutputSchema,
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
  audience: "undergraduate" | "graduate" | "seminary";
  context?: string;
  sources: SourceSnippet[];
  ontologyTerms: string[];
  language?: "en" | "es" | "la";
};

export async function runScholasticDebate({
  question,
  audience,
  context,
  sources,
  ontologyTerms,
  language = "en",
}: RunScholasticDebateParams): Promise<ScholasticDebateOutput> {
  const targetLabel = language === "es" ? "Spanish" : language === "la" ? "Latin" : "English";
  const sourcesText = sources
    .map(
      (s, i) => `Source ${i + 1}
Title: ${s.title}
Citation: ${s.citation}
Text: ${s.text}`,
    )
    .join("\n\n");

  const ontologyText = ontologyTerms.length ? ontologyTerms.join(", ") : "None detected";

  const systemPrompt = `
${sharedThomisticRules}

You are a single-pass Thomistic scholastic debate agent.

Produce the complete answer in the structure of a Summa-style article:
- 3 strong objections.
- 1 brief sed contra.
- 1 central respondeo with definitions and distinctions.
- Exactly 1 reply per objection.
- 1 short contemporary application.

Use only the supplied sources for citations or textual support. Do not invent citations.
Write every JSON string field in ${targetLabel}.
Return valid JSON only.

JSON shape:
{
  "objections": ["string", "string", "string"],
  "sedContra": "string",
  "respondeo": "string",
  "replies": ["string", "string", "string"],
  "application": "string"
}
`;

  const userPrompt = `
Target language:
${targetLabel}

Question:
${question}

Audience:
${audience}

Optional context:
${context ?? "None provided"}

Detected ontology terms:
${ontologyText}

Sources:
${sourcesText || "No sources available"}

Return JSON only.
`;

  return withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        operationName: "scholastic-debate-agent-model-call",
        maxTokens: 1600,
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
