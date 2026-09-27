import type { SourceSnippet } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { callModel } from "@/lib/llm/callModel";
import { prisma } from "@/lib/db/prisma";
import { fetchSummaArticle, formatStCitation, parseStCitation, type SummaLanguage } from "@/lib/retrieval/summaText";
import { getArticle } from "@/lib/knowledge/bundle";
import { lexicalRanking } from "@/lib/knowledge/search";
import type { KnowledgeArticle } from "@/lib/knowledge/types";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";

export { tokenize } from "@/lib/knowledge/lexical";

/** Textos de Tomás del bundle OKF (knowledge/articulos). */
export function getCorpusEntry(id: string): KnowledgeArticle | undefined {
  return getArticle(id);
}

export function toSnippet(article: KnowledgeArticle): SourceSnippet {
  return {
    id: article.id,
    title: article.title,
    citation: article.citation,
    text: article.text,
    url: article.url,
    kind: "summary",
  };
}

/**
 * Búsqueda léxica sincrónica sobre el bundle (usada en la respuesta de respaldo sin LLM).
 * La búsqueda completa, con conceptos, grafo y embeddings, está en src/lib/knowledge/search.ts.
 */
export function retrieveAquinasSources(query: string, topK = 4, minScore = 3): SourceSnippet[] {
  return lexicalRanking(query, undefined, minScore)
    .slice(0, topK)
    .flatMap(([id]) => {
      const article = getArticle(id);
      return article ? [toSnippet(article)] : [];
    });
}

const TranslatedSourceSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    text: z.string(),
  })
  .strip();

const TranslatedSourcesSchema = z.array(TranslatedSourceSchema);

// Cambiar la versión invalida la caché persistida (las filas v1 eran traducciones
// por LLM de resúmenes, no el texto real de la Summa).
const LOCALIZATION_CACHE_VERSION = "v2";
const cacheLanguage = (language: SummaLanguage) => `${language}@${LOCALIZATION_CACHE_VERSION}`;

type PersistedLocalization = { title: string; text: string; url: string | null };

async function loadPersistedLocalizations(
  sourceIds: string[],
  language: SummaLanguage,
): Promise<Map<string, PersistedLocalization>> {
  try {
    const rows = await prisma.sourceLocalization.findMany({
      where: { sourceId: { in: sourceIds }, language: cacheLanguage(language) },
    });
    return new Map(rows.map((row) => [row.sourceId, { title: row.title, text: row.text, url: row.url }]));
  } catch (error) {
    // DB opcional/no inicializada: seguimos sin cache persistente.
    logger.debug("Could not load persisted source localizations", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return new Map();
  }
}

async function persistLocalizations(sources: SourceSnippet[], language: SummaLanguage): Promise<void> {
  if (sources.length === 0) return;
  try {
    await Promise.all(
      sources.map((s) =>
        prisma.sourceLocalization.upsert({
          where: { sourceId_language: { sourceId: s.id, language: cacheLanguage(language) } },
          create: { sourceId: s.id, language: cacheLanguage(language), title: s.title, text: s.text, url: s.url ?? null },
          update: { title: s.title, text: s.text, url: s.url ?? null },
        }),
      ),
    );
  } catch (error) {
    logger.debug("Could not persist source localizations", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

async function translateSummaries(sources: SourceSnippet[], language: "es" | "la"): Promise<SourceSnippet[]> {
  const targetLabel = language === "es" ? "Spanish" : "Latin";
  const systemPrompt = `
You are a precise translator of scholarly texts. Return JSON only.
Input is a list of items with id/title/text (English).
Output must be a JSON array of objects: { "id": string, "title": string, "text": string }.
Translate title and text into ${targetLabel} faithfully, keeping Latin technical terms. Keep "id" untouched. Do NOT add, remove, or reorder items.
Do NOT include any commentary or extra fields. Valid JSON only.
`;
  const userPrompt = `
Items to translate to ${targetLabel}:

${sources.map((s, i) => `Item ${i + 1}:\nid: ${s.id}\ntitle: ${s.title}\ntext: ${s.text}`).join("\n\n")}
`;

  const translated = await withRetry(
    async () => {
      const raw = await callModel({
        systemPrompt,
        userPrompt,
        temperature: 0,
        operationName: "translate-aquinas-sources",
        maxTokens: 1500,
      });
      return parseJsonWithSchema(raw, TranslatedSourcesSchema);
    },
    { operationName: "translate-aquinas-sources", maxAttempts: 2, initialDelayMs: 300, backoffMultiplier: 2 },
  );

  const byId = new Map(translated.map((t) => [t.id, t]));
  return sources.map((s) => {
    const hit = byId.get(s.id);
    return hit ? { ...s, title: hit.title, text: hit.text } : s;
  });
}

/**
 * Sustituye cada fuente por el texto real de Tomás en el idioma pedido cuando es un
 * artículo de la Summa (New Advent / hjg.com.ar / Corpus Thomisticum). Las demás
 * conservan su resumen, traducido por LLM si hace falta. Las fuentes sin texto
 * (citas propuestas por el modelo que no se pudieron verificar) se descartan.
 */
export async function hydrateAquinasSources(
  sources: SourceSnippet[],
  language: SummaLanguage,
): Promise<SourceSnippet[]> {
  if (sources.length === 0) return sources;

  const persisted = await loadPersistedLocalizations(sources.map((s) => s.id), language);

  const resolved = await Promise.all(
    sources.map(async (source): Promise<{ source: SourceSnippet; fetched: boolean }> => {
      const citation = parseStCitation(source.citation);
      const cached = persisted.get(source.id);
      if (cached) {
        return {
          source: { ...source, title: cached.title, text: cached.text, url: cached.url ?? source.url, kind: citation ? "text" : "summary" },
          fetched: false,
        };
      }
      if (!citation) return { source, fetched: false };

      const article = await fetchSummaArticle(citation, language);
      if (!article) return { source, fetched: false };
      return {
        source: {
          ...source,
          // Corpus Thomisticum no trae títulos de artículo: en latín se usa la referencia.
          title:
            article.title ??
            (language === "la"
              ? `Summa Theologiae, ${formatStCitation(citation).replace(/^ST /, "")}`
              : source.text
                ? source.title
                : formatStCitation(citation)),
          text: article.text,
          url: article.url,
          kind: "text",
        },
        fetched: true,
      };
    }),
  );

  const withText = resolved.filter(({ source }) => source.text.trim().length > 0);
  await persistLocalizations(
    withText.filter((r) => r.fetched).map((r) => r.source),
    language,
  );

  let result = withText.map((r) => r.source);

  // Resúmenes del corpus que siguen en inglés: se traducen (y se cachean solo si no son de la Summa,
  // para reintentar la descarga del texto real en la próxima ejecución).
  const pendingTranslation = result.filter((s) => s.kind === "summary" && !persisted.has(s.id));
  if (language !== "en" && pendingTranslation.length > 0) {
    try {
      const translated = await translateSummaries(pendingTranslation, language);
      const byId = new Map(translated.map((s) => [s.id, s]));
      result = result.map((s) => byId.get(s.id) ?? s);
      await persistLocalizations(
        translated.filter((s) => !parseStCitation(s.citation)),
        language,
      );
    } catch (error) {
      logger.warn("Failed to translate source summaries, keeping originals", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
