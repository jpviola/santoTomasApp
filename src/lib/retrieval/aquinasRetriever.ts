import corpus from "@/data/corpus/summa-sample.json";
import type { SourceSnippet } from "@/lib/schemas/debate";
import type { Retriever } from "@/lib/retrieval/retriever";
import { withRetry } from "@/lib/llm/withRetry";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { callModel } from "@/lib/llm/callModel";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";

type RankedSnippet = SourceSnippet & { score: number };

const normalize = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
};

const scoreText = (queryTokens: string[], text: string): number => {
  const textTokens = new Set(normalize(text));
  let score = 0;

  for (const token of queryTokens) {
    if (textTokens.has(token)) score += 1;
  }

  return score;
};

export async function retrieveAquinasSources(question: string, topK = 3): Promise<SourceSnippet[]> {
  const queryTokens = normalize(question);

  const ranked: RankedSnippet[] = (corpus as SourceSnippet[])
    .map((item) => ({
      ...item,
      score: scoreText(queryTokens, item.title) * 2 + scoreText(queryTokens, item.text),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, topK).map((item) => ({
    id: item.id,
    title: item.title,
    citation: item.citation,
    text: item.text,
  }));
}

const TranslatedSourceSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    text: z.string(),
  })
  .strip();

const TranslatedSourcesSchema = z.array(TranslatedSourceSchema);

export async function localizeAquinasSources(
  sources: SourceSnippet[],
  language: "en" | "es",
): Promise<SourceSnippet[]> {
  if (language !== "es" || sources.length === 0) {
    return sources;
  }

  const userPromptParts = sources
    .map(
      (s, i) => `Item ${i + 1}:
id: ${s.id}
title: ${s.title}
text: ${s.text}`,
    )
    .join("\n\n");

  const systemPrompt = `
You are a precise translator. Return JSON only.
Input is a list of items with id/title/text (English).
Output must be a JSON array of objects: { "id": string, "title": string, "text": string }.
Translate title and text into Spanish faithfully. Keep "id" untouched. Do NOT add, remove, or reorder items.
Do NOT include any commentary or extra fields. Valid JSON only.
`;

  const userPrompt = `
Items to translate to Spanish:

${userPromptParts}
`;

  try {
    const translated = await withRetry(
      async () => {
        const raw = await callModel({
          systemPrompt,
          userPrompt,
          temperature: 0.0,
          operationName: "translate-aquinas-sources",
          maxTokens: 800,
        });

        logger.debug("Translate sources raw response", { responsePreview: raw.slice(0, 400) });

        const parsed = parseJsonWithSchema(raw, TranslatedSourcesSchema);
        const byId = new Map(parsed.map((p) => [p.id, p]));
        return sources.map((s) => {
          const t = byId.get(s.id);
          if (!t) return s;
          return { ...s, title: t.title, text: t.text };
        });
      },
      {
        operationName: "translate-aquinas-sources",
        maxAttempts: 2,
        initialDelayMs: 300,
        backoffMultiplier: 2,
      },
    );

    return translated;
  } catch (error) {
    logger.warn("Failed to translate sources, falling back to originals", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return sources;
  }
}

export const createAquinasRetriever = (): Retriever => {
  return {
    async retrieve(request) {
      const query = (request.query ?? request.question).trim();
      if (query.length === 0) {
        return [];
      }

      return retrieveAquinasSources(query, request.limit ?? 3);
    },
  };
};
