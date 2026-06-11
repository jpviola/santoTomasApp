import { callModel } from "@/lib/llm/callModel";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { moderatorSystemPrompt } from "@/lib/prompts/moderatorPrompt";
import { ModeratorOutputSchema } from "@/lib/schemas/debate";
import type { ModeratorOutput } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";
import { JsonExtractionError, JsonParseError, ModelResponseValidationError } from "@/lib/utils/errors";
import { getOntologyEngine, type OntologyTerm } from "@/lib/agents/OntologyEngine";

type RunModeratorParams = {
  question: string;
  audience: "undergraduate" | "graduate" | "seminary";
  context?: string;
  language?: "en" | "es" | "la";
  /** Términos ya resueltos por el orquestador para evitar una segunda consulta SPARQL. */
  ontologyTerms?: OntologyTerm[];
};

export async function runModerator({ question, audience, context, language = "en", ontologyTerms }: RunModeratorParams): Promise<ModeratorOutput> {
  // 1. Contexto semántico de la ontología (reutiliza los términos si ya fueron resueltos)
  const relevantTerms = ontologyTerms ?? await getOntologyEngine().findRelevantTerms(question);
  const ontologyContext = relevantTerms.length > 0 
    ? `Relevant Scholastic Concepts identified (IDs to include in 'ontologyTopics' if applicable):\n${relevantTerms.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}`
    : "";

  // 2. Preparar el prompt con el conocimiento de la ontología
  const targetLabel = language === "es" ? "Spanish" : language === "la" ? "Latin" : "English";
  const systemPrompt =
    language === "es"
      ? `${moderatorSystemPrompt}\n\nAll JSON string fields must be written in Spanish. Identify and include relevant 'st:topics' from the Scholastic Ontology.\n`
      : language === "la"
        ? `${moderatorSystemPrompt}\n\nAll JSON string fields must be written in Latin.\n`
      : moderatorSystemPrompt;

  const userPrompt = `
Target language:
${targetLabel}

${ontologyContext}

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
