import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { objectionsSystemPrompt } from "@/lib/prompts/objectionsPrompt";
import { ObjectionsOutputSchema } from "@/lib/schemas/debate";
import type { ObjectionsOutput, SourceSnippet } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";
import { JsonExtractionError, JsonParseError, ModelResponseValidationError } from "@/lib/utils/errors";

type RunObjectionsParams = {
  question: string;
  framing: string;
  precisionNotes: string[];
  sources: SourceSnippet[];
  language?: "en" | "es";
};

export async function runObjections({
  question,
  framing,
  precisionNotes,
  sources,
  language = "en",
}: RunObjectionsParams): Promise<ObjectionsOutput> {
  const systemPrompt =
    language === "es"
      ? `${objectionsSystemPrompt}\n\nAll JSON string fields must be written in Spanish.\n`
      : objectionsSystemPrompt;

  const sourcesText = sources
    .map(
      (s, i) => `Source ${i + 1}
Title: ${s.title}
Citation: ${s.citation}
Text: ${s.text}`,
    )
    .join("\n\n");

  const userPrompt = `
Target language:
${language === "es" ? "Spanish" : "English"}
Write all generated text fields in the target language.

Question:
${question}

Framing:
${framing}

Precision notes:
${precisionNotes.length ? precisionNotes.join("\n- ") : "None"}

Sources:
${sourcesText || "No sources available"}

Produce exactly 3 strong objections.
Return JSON only.
`;

  return withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        operationName: "objections-agent-model-call",
      });

      logger.debug("Objections raw response received", {
        responsePreview: raw.slice(0, 500),
      });

      return parseJsonWithSchema(raw, ObjectionsOutputSchema);
    },
    {
      operationName: "objections-agent-parse-cycle",
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
