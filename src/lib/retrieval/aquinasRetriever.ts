import corpusData from "@/data/corpus/aquinas-corpus.json";
import type { SourceSnippet } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { callModel } from "@/lib/llm/callModel";
import { prisma } from "@/lib/db/prisma";
import { fetchSummaArticle, formatStCitation, parseStCitation, type SummaLanguage } from "@/lib/retrieval/summaText";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";

export type CorpusEntry = SourceSnippet & { topics: string[]; keywords: string[] };

const corpus = corpusData as CorpusEntry[];

const STOPWORDS = new Set([
  // es
  "que", "qué", "los", "las", "del", "con", "por", "para", "una", "uno", "unos", "unas", "como", "cómo", "cual", "cuál",
  "segun", "según", "sobre", "entre", "desde", "hasta", "este", "esta", "esto", "estos", "estas", "ese", "esa", "eso",
  "son", "fue", "ser", "puede", "pueden", "hay", "más", "mas", "muy", "sus", "nos", "les", "donde", "cuando", "tomas",
  "tomás", "santo", "aquino", "dice", "decir", "entiende", "piensa", "diferencia",
  // en
  "the", "and", "for", "with", "what", "which", "that", "this", "these", "those", "does", "did", "can", "could", "would",
  "should", "are", "was", "were", "has", "have", "how", "why", "about", "into", "from", "than", "then", "there", "their",
  "according", "thomas", "aquinas", "saint", "say", "says", "think", "understand", "difference", "between",
]);

const stripAccents = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");

const stem = (token: string) => {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
};

export function tokenize(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
    .map(stem);
}

const tokensMatch = (a: string, b: string) =>
  a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a)));

type IndexedEntry = {
  entry: CorpusEntry;
  keywordTokens: string[];
  titleTokens: string[];
  textTokens: string[];
  phrases: string[];
};

const index: IndexedEntry[] = corpus.map((entry) => ({
  entry,
  keywordTokens: [...new Set(entry.keywords.flatMap(tokenize))],
  titleTokens: [...new Set(tokenize(entry.title))],
  textTokens: [...new Set(tokenize(entry.text))],
  phrases: entry.keywords.filter((k) => k.includes(" ")).map((k) => stripAccents(k.toLowerCase())),
}));

const corpusById = new Map(corpus.map((entry) => [entry.id, entry]));

export function getCorpusEntry(id: string): CorpusEntry | undefined {
  return corpusById.get(id);
}

function scoreEntry(queryTokens: string[], normalizedQuery: string, indexed: IndexedEntry): number {
  let score = 0;
  for (const token of queryTokens) {
    if (indexed.keywordTokens.some((k) => tokensMatch(token, k))) score += 3;
    else if (indexed.titleTokens.some((t) => tokensMatch(token, t))) score += 2;
    else if (indexed.textTokens.some((t) => tokensMatch(token, t))) score += 1;
  }
  for (const phrase of indexed.phrases) {
    if (normalizedQuery.includes(phrase)) score += 3;
  }
  return score;
}

export function toSnippet(entry: CorpusEntry): SourceSnippet {
  return {
    id: entry.id,
    title: entry.title,
    citation: entry.citation,
    text: entry.text,
    url: entry.url,
    kind: "summary",
  };
}

/**
 * Búsqueda léxica bilingüe sobre el corpus curado. Solo devuelve entradas con al
 * menos una coincidencia de palabra clave (score >= minScore): es preferible no
 * dar fuentes a dar fuentes que no tienen que ver con la pregunta.
 */
export function retrieveAquinasSources(query: string, topK = 4, minScore = 3): SourceSnippet[] {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return [];
  const normalizedQuery = stripAccents(query.toLowerCase());

  return index
    .map((indexed) => ({ entry: indexed.entry, score: scoreEntry(queryTokens, normalizedQuery, indexed) }))
    .filter((ranked) => ranked.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((ranked) => toSnippet(ranked.entry));
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
          title: article.title ?? (source.text ? source.title : formatStCitation(citation)),
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
