import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { moderatorSystemPrompt } from "@/lib/prompts/moderatorPrompt";
import { ModeratorOutputSchema } from "@/lib/schemas/debate";
import type { ModeratorOutput } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";
import { JsonExtractionError, JsonParseError, ModelResponseValidationError } from "@/lib/utils/errors";

type RunModeratorParams = {
  question: string;
  audience: "undergraduate" | "graduate" | "seminary";
  context?: string;
  language?: "en" | "es";
};

export async function runModerator({ question, audience, context, language = "en" }: RunModeratorParams): Promise<ModeratorOutput> {
  const systemPrompt =
    language === "es"
      ? `${moderatorSystemPrompt}\n\nAll JSON string fields must be written in Spanish.\n`
      : moderatorSystemPrompt;

  const userPrompt = `
Target language:
${language === "es" ? "Spanish" : "English"}
Write all generated text fields in the target language.

Question:
${question}

Audience:
${audience}

Optional context:
${context ?? "None provided"}

Return JSON only.
`;

  return withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        operationName: "moderator-agent-model-call",
      });

      logger.debug("Moderator raw response received", {
        responsePreview: raw.slice(0, 500),
      });

      return parseJsonWithSchema(raw, ModeratorOutputSchema);
    },
    {
      operationName: "moderator-agent-parse-cycle",
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
