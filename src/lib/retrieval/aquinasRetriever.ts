import corpus from "@/data/corpus/summa-sample.json";
import type { SourceSnippet } from "@/lib/schemas/debate";
import { withRetry } from "@/lib/llm/withRetry";
import { parseJsonWithSchema } from "@/lib/llm/parseJson";
import { callModel } from "@/lib/llm/callModel";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";

type RankedSnippet = SourceSnippet & { score: number };

type ParsedStCitation = {
  part: "I" | "I-II" | "II-II" | "III";
  question: number;
  article: number;
};

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
    url: item.url,
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

const globalForSourceCache = globalThis as unknown as { __st_sourceCache?: Map<string, string> };
const sourceHtmlCache = globalForSourceCache.__st_sourceCache ?? new Map<string, string>();
globalForSourceCache.__st_sourceCache = sourceHtmlCache;

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStCitation(citation: string): ParsedStCitation | null {
  const match = citation.match(/ST\s+(I-II|II-II|III|I)\s*,\s*q\.(\d+)\s*,\s*a\.(\d+)/i);
  if (!match) return null;
  const part = match[1].toUpperCase() as ParsedStCitation["part"];
  const question = Number(match[2]);
  const article = Number(match[3]);
  if (!Number.isFinite(question) || !Number.isFinite(article)) return null;
  return { part, question, article };
}

function pad3(value: number) {
  return String(value).padStart(3, "0");
}

function buildSumatUrl(c: ParsedStCitation) {
  const partLetter = c.part === "I" ? "a" : c.part === "I-II" ? "b" : c.part === "II-II" ? "c" : "d";
  return `https://hjg.com.ar/sumat/${partLetter}/c${c.question}.html`;
}

function buildCorpusThomisticumUrl(c: ParsedStCitation) {
  const digit = c.part === "I" ? "1" : c.part === "I-II" ? "2" : c.part === "II-II" ? "3" : "4";
  return `https://www.corpusthomisticum.org/sth${digit}${pad3(c.question)}.html`;
}

async function fetchTextCached(url: string) {
  const cached = sourceHtmlCache.get(url);
  if (cached) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    const text = await response.text();
    sourceHtmlCache.set(url, text);
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function extractSpanishExcerptFromSumat(html: string, articleNumber: number) {
  const plain = stripHtml(html);
  const marker = `Artículo ${articleNumber}:`;
  const start = plain.indexOf(marker);
  if (start < 0) return null;
  const next = plain.indexOf("Artículo ", start + marker.length);
  const articleBlock = next > 0 ? plain.slice(start, next) : plain.slice(start);
  const respondeoStart = articleBlock.indexOf("Respondo:");
  const respondeoBlock = respondeoStart >= 0 ? articleBlock.slice(respondeoStart) : articleBlock;
  const end = respondeoBlock.indexOf("A las objeciones:");
  const excerpt = end > 0 ? respondeoBlock.slice(0, end) : respondeoBlock;
  return excerpt.trim();
}

function extractLatinExcerptFromCorpus(html: string, articleNumber: number) {
  const plain = stripHtml(html);
  const marker = `Articulus ${articleNumber}`;
  const start = plain.indexOf(marker);
  if (start < 0) return null;
  const next = plain.indexOf("Articulus ", start + marker.length);
  const articleBlock = next > 0 ? plain.slice(start, next) : plain.slice(start);
  const respondeoStart = articleBlock.toLowerCase().indexOf("respondeo dicendum");
  const block = respondeoStart >= 0 ? articleBlock.slice(respondeoStart) : articleBlock;
  const adStart = block.toLowerCase().indexOf("ad primum");
  const excerpt = adStart > 0 ? block.slice(0, adStart) : block;
  return excerpt.trim();
}

async function loadPersistedLocalizations(
  sourceIds: string[],
  language: string,
): Promise<Map<string, { title: string; text: string; url: string | null }>> {
  try {
    const rows = await prisma.sourceLocalization.findMany({
      where: { sourceId: { in: sourceIds }, language },
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

async function persistLocalizations(
  localized: SourceSnippet[],
  originals: Map<string, SourceSnippet>,
  language: string,
): Promise<void> {
  const changed = localized.filter((s) => {
    const original = originals.get(s.id);
    return original && (original.text !== s.text || original.title !== s.title);
  });
  if (changed.length === 0) return;

  try {
    await Promise.all(
      changed.map((s) =>
        prisma.sourceLocalization.upsert({
          where: { sourceId_language: { sourceId: s.id, language } },
          create: { sourceId: s.id, language, title: s.title, text: s.text, url: s.url ?? null },
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

export async function localizeAquinasSources(
  sources: SourceSnippet[],
  language: "en" | "es" | "la",
): Promise<SourceSnippet[]> {
  if (language === "en" || sources.length === 0) {
    return sources;
  }

  // 1. Cache persistente: traducciones ya obtenidas en ejecuciones anteriores.
  const persisted = await loadPersistedLocalizations(sources.map((s) => s.id), language);
  const pending = sources.filter((s) => !persisted.has(s.id));

  const applyPersisted = (list: SourceSnippet[]) =>
    list.map((s) => {
      const hit = persisted.get(s.id);
      return hit ? { ...s, title: hit.title, text: hit.text, url: hit.url ?? s.url } : s;
    });

  if (pending.length === 0) {
    return applyPersisted(sources);
  }

  const originalsById = new Map(sources.map((s) => [s.id, s]));
  const finish = async (localized: SourceSnippet[]) => {
    await persistLocalizations(localized, originalsById, language);
    return applyPersisted(localized);
  };

  // 2. Localización vía web (solo las fuentes sin traducción persistida).
  const localizedViaWeb = await Promise.all(
    pending.map(async (s) => {
      const parsed = parseStCitation(s.citation);
      if (!parsed) return null;

      try {
        if (language === "es") {
          const url = buildSumatUrl(parsed);
          const html = await fetchTextCached(url);
          const excerpt = extractSpanishExcerptFromSumat(html, parsed.article);
          if (!excerpt) return null;
          return { ...s, url, text: excerpt };
        }

        const url = buildCorpusThomisticumUrl(parsed);
        const html = await fetchTextCached(url);
        const excerpt = extractLatinExcerptFromCorpus(html, parsed.article);
        if (!excerpt) return null;
        return { ...s, url, text: excerpt };
      } catch (error) {
        logger.warn("Failed to localize source via web", {
          citation: s.citation,
          language,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }),
  );

  const haveWebLocalization = localizedViaWeb.some(Boolean);
  if (haveWebLocalization) {
    const webById = new Map<string, SourceSnippet>(
      localizedViaWeb.flatMap((s) => (s ? [[s.id, s] as const] : [])),
    );
    return finish(sources.map((s) => webById.get(s.id) ?? s));
  }

  // 3. Traducción vía LLM (solo las pendientes).
  const userPromptParts = pending
    .map(
      (s, i) => `Item ${i + 1}:
id: ${s.id}
title: ${s.title}
text: ${s.text}`,
    )
    .join("\n\n");

  const targetLabel = language === "es" ? "Spanish" : "Latin";
  const systemPrompt = `
You are a precise translator. Return JSON only.
Input is a list of items with id/title/text (English).
Output must be a JSON array of objects: { "id": string, "title": string, "text": string }.
Translate title and text into ${targetLabel} faithfully. Keep "id" untouched. Do NOT add, remove, or reorder items.
Do NOT include any commentary or extra fields. Valid JSON only.
`;

  const userPrompt = `
Items to translate to ${targetLabel}:

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
          const translatedItem = byId.get(s.id);
          if (!translatedItem) return s;
          return { ...s, title: translatedItem.title, text: translatedItem.text };
        });
      },
      {
        operationName: "translate-aquinas-sources",
        maxAttempts: 2,
        initialDelayMs: 300,
        backoffMultiplier: 2,
      },
    );

    return finish(translated);
  } catch (error) {
    logger.warn("Failed to translate sources, falling back to originals", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return applyPersisted(sources);
  }
}
