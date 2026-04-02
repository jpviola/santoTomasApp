import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { repliesSystemPrompt } from "@/lib/prompts/repliesPrompt";
import { RepliesOutputSchema } from "@/lib/schemas/debate";
import type { RepliesOutput } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";
import { JsonExtractionError, JsonParseError, ModelResponseValidationError } from "@/lib/utils/errors";

type RunRepliesParams = {
  question: string;
  objections: string[];
  respondeo: string;
  language?: "en" | "es";
};

export async function runReplies({ question, objections, respondeo, language = "en" }: RunRepliesParams): Promise<RepliesOutput> {
  const systemPrompt =
    language === "es"
      ? `${repliesSystemPrompt}\n\nAll JSON string fields must be written in Spanish.\n`
      : repliesSystemPrompt;

  const objectionsText = objections.map((o, i) => `${i + 1}. ${o}`).join("\n");

  const userPrompt = `
Target language:
${language === "es" ? "Spanish" : "English"}
Write all generated text fields in the target language.

Question:
${question}

Objections:
${objectionsText}

Respondeo:
${respondeo}

Write exactly one reply per objection.
Return JSON only.
`;

  return withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        operationName: "replies-agent-model-call",
      });

      logger.debug("Replies raw response received", {
        responsePreview: raw.slice(0, 500),
      });

      return parseJsonWithSchema(raw, RepliesOutputSchema);
    },
    {
      operationName: "replies-agent-parse-cycle",
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
