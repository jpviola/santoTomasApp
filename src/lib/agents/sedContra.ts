import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { sedContraSystemPrompt } from "@/lib/prompts/sedContraPrompt";
import { SedContraOutputSchema } from "@/lib/schemas/debate";
import type { SedContraOutput, SourceSnippet } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";
import { JsonExtractionError, JsonParseError, ModelResponseValidationError } from "@/lib/utils/errors";

type RunSedContraParams = {
  question: string;
  sources: SourceSnippet[];
  language?: "en" | "es";
};

export async function runSedContra({ question, sources, language = "en" }: RunSedContraParams): Promise<SedContraOutput> {
  const systemPrompt =
    language === "es"
      ? `${sedContraSystemPrompt}\n\nAll JSON string fields must be written in Spanish.\n`
      : sedContraSystemPrompt;

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

Sources:
${sourcesText || "No sources available"}

Write one brief "On the contrary" statement.
Return JSON only.
`;

  return withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        operationName: "sedcontra-agent-model-call",
      });

      logger.debug("SedContra raw response received", {
        responsePreview: raw.slice(0, 500),
      });

      return parseJsonWithSchema(raw, SedContraOutputSchema);
    },
    {
      operationName: "sedcontra-agent-parse-cycle",
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
