import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { respondeoSystemPrompt } from "@/lib/prompts/respondeoPrompt";
import { RespondeoOutputSchema } from "@/lib/schemas/debate";
import type { RespondeoOutput, SourceSnippet } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";
import { JsonExtractionError, JsonParseError, ModelResponseValidationError } from "@/lib/utils/errors";

type RunRespondeoParams = {
  question: string;
  framing: string;
  precisionNotes: string[];
  objections: string[];
  sedContra: string;
  sources: SourceSnippet[];
  audience: "undergraduate" | "graduate" | "seminary";
  language?: "en" | "es" | "la";
};

export async function runRespondeo({
  question,
  framing,
  precisionNotes,
  objections,
  sedContra,
  sources,
  audience,
  language = "en",
}: RunRespondeoParams): Promise<RespondeoOutput> {
  const targetLabel = language === "es" ? "Spanish" : language === "la" ? "Latin" : "English";
  const systemPrompt =
    language === "es"
      ? `${respondeoSystemPrompt}\n\nAll JSON string fields must be written in Spanish.\n`
      : language === "la"
        ? `${respondeoSystemPrompt}\n\nAll JSON string fields must be written in Latin.\n`
      : respondeoSystemPrompt;

  const objectionsText = objections.map((o, i) => `${i + 1}. ${o}`).join("\n");
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
${targetLabel}
Write all generated text fields in the target language.

Question:
${question}

Audience:
${audience}

Framing:
${framing}

Precision notes:
${precisionNotes.length ? precisionNotes.join("\n- ") : "None"}

Objections:
${objectionsText}

Sed Contra:
${sedContra}

Sources:
${sourcesText || "No sources available"}

Write a scholastic respondeo and one short contemporary application.
Return JSON only.
`;

  return withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        operationName: "respondeo-agent-model-call",
      });

      logger.debug("Respondeo raw response received", {
        responsePreview: raw.slice(0, 500),
      });

      return parseJsonWithSchema(raw, RespondeoOutputSchema);
    },
    {
      operationName: "respondeo-agent-parse-cycle",
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
