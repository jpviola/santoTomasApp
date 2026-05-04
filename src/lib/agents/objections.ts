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
  ontologyTerms?: string[];
  language?: "en" | "es" | "la";
};

export async function runObjections({
  question,
  framing,
  precisionNotes,
  sources,
  ontologyTerms = [],
  language = "en",
}: RunObjectionsParams): Promise<ObjectionsOutput> {
  const targetLabel = language === "es" ? "Spanish" : language === "la" ? "Latin" : "English";
  const systemPrompt =
    language === "es"
      ? `${objectionsSystemPrompt}\n\nAll JSON string fields must be written in Spanish.\n`
      : language === "la"
        ? `${objectionsSystemPrompt}\n\nAll JSON string fields must be written in Latin.\n`
      : objectionsSystemPrompt;

  const ontologyHeader = ontologyTerms.length > 0
    ? (language === "es" ? `Conceptos ontológicos clave: ${ontologyTerms.join(", ")}` : `Key ontological concepts: ${ontologyTerms.join(", ")}`)
    : "";

  const sourcesText = sources
    .map((s, i) => {
      return `Source ${i + 1}
Title: ${s.title}
Citation: ${s.citation}
Text: ${s.text}`;
    })
    .join("\n\n");

  const userPrompt = `
Target language:
${targetLabel}
Write all generated text fields in the target language.

Question:
${question}

${ontologyHeader}

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
