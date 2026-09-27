import { logger } from "@/lib/utils/logger";

export type SummaLanguage = "en" | "es" | "la";
export type StPart = "I" | "I-II" | "II-II" | "III";

export type StCitation = {
  part: StPart;
  question: number;
  article: number;
};

export type SummaArticleText = {
  title?: string;
  text: string;
  url: string;
};

// Cantidad de cuestiones por parte de la Summa (sin el Supplementum).
const QUESTIONS_PER_PART: Record<StPart, number> = {
  I: 119,
  "I-II": 114,
  "II-II": 189,
  III: 90,
};

const PART_PATTERN = String.raw`(I-II|II-II|Ia[\s-]*IIae|IIa[\s-]*IIae|IIIa|III|Ia|I)`;
const CITATION_PATTERN = new RegExp(
  String.raw`(?:^|[^\w-])${PART_PATTERN}\s*,?\s*q(?:uaestio|u?\.)?\s*(\d{1,3})\s*,?\s*a(?:rt(?:iculus|\.)?|\.)?\s*(\d{1,2})(?!\d)`,
  "i",
);

// El guion importa: "I-II" y "III" solo se distinguen por él.
const PART_ALIASES: Record<string, StPart> = {
  i: "I",
  ia: "I",
  "i-ii": "I-II",
  "ia-iiae": "I-II",
  "ii-ii": "II-II",
  "iia-iiae": "II-II",
  iii: "III",
  iiia: "III",
};

/**
 * Reconoce citas de la Summa Theologiae en los formatos habituales:
 * "ST I-II, q.94, a.2", "S.Th. II-II q. 58 a. 1", "Ia-IIae q.90 art.4", "I, q.2, a.3, ad 1".
 */
export function parseStCitation(citation: string): StCitation | null {
  const match = citation.match(CITATION_PATTERN);
  if (!match) return null;

  const part = PART_ALIASES[match[1].toLowerCase().replace(/\s*-\s*|\s+/g, "-")];
  if (!part) return null;

  const question = Number(match[2]);
  const article = Number(match[3]);
  if (!Number.isInteger(question) || !Number.isInteger(article)) return null;
  if (question < 1 || question > QUESTIONS_PER_PART[part]) return null;
  if (article < 1 || article > 20) return null;
  return { part, question, article };
}

export function formatStCitation(c: StCitation): string {
  return `ST ${c.part}, q.${c.question}, a.${c.article}`;
}

/** Id estable de fuente, compatible con los ids del corpus local (p. ej. "st-i-ii-q94-a2"). */
export function stSourceId(c: StCitation): string {
  return `st-${c.part.toLowerCase()}-q${c.question}-a${c.article}`;
}

const pad3 = (value: number) => String(value).padStart(3, "0");
const partDigit = (part: StPart) => (part === "I" ? "1" : part === "I-II" ? "2" : part === "II-II" ? "3" : "4");
const partLetter = (part: StPart) => (part === "I" ? "a" : part === "I-II" ? "b" : part === "II-II" ? "c" : "d");

/** Página de la cuestión completa en la edición de referencia de cada idioma. */
export function buildQuestionUrl(c: StCitation, language: SummaLanguage): string {
  if (language === "es") return `https://hjg.com.ar/sumat/${partLetter(c.part)}/c${c.question}.html`;
  if (language === "la") return `https://www.corpusthomisticum.org/sth${partDigit(c.part)}${pad3(c.question)}.html`;
  return `https://www.newadvent.org/summa/${partDigit(c.part)}${pad3(c.question)}.htm`;
}

/** Enlace directo al artículo (con ancla cuando el sitio la ofrece). */
export function buildArticleUrl(c: StCitation, language: SummaLanguage): string {
  const base = buildQuestionUrl(c, language);
  return language === "en" ? `${base}#article${c.article}` : base;
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  ordf: "ª",
  ordm: "º",
  aelig: "æ",
  AElig: "Æ",
  oelig: "œ",
  copy: "©",
  bull: "•",
  laquo: "«",
  raquo: "»",
  iquest: "¿",
  iexcl: "¡",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

const ACCENTED = /^([aeiouAEIOUnNcCyY])(acute|grave|circ|uml|tilde|cedil)$/;
const COMBINING: Record<string, string> = {
  acute: "\u0301",
  grave: "\u0300",
  circ: "\u0302",
  uml: "\u0308",
  tilde: "\u0303",
  cedil: "\u0327",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith("#")) {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (name in NAMED_ENTITIES) return NAMED_ENTITIES[name];
    const accented = name.match(ACCENTED);
    if (accented) return `${accented[1]}${COMBINING[accented[2]]}`.normalize("NFC");
    return whole;
  });
}

export function htmlToPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function sliceBetween(text: string, start: RegExp, ends: RegExp[]): string | null {
  const startMatch = start.exec(text);
  if (!startMatch) return null;
  const from = startMatch.index;
  const rest = text.slice(from + startMatch[0].length);
  let cut = rest.length;
  for (const end of ends) {
    const endMatch = end.exec(rest);
    if (endMatch && endMatch.index < cut) cut = endMatch.index;
  }
  return text.slice(from, from + startMatch[0].length + cut).trim();
}

/** Recorta en el último final de oración antes del límite. */
export function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf("? "));
  const cut = lastStop > maxChars * 0.5 ? slice.slice(0, lastStop + 1) : slice;
  return `${cut.trim()} […]`;
}

type ArticleParts = { title?: string; respondeo: string };

function extractEnglish(plain: string, article: number): ArticleParts | null {
  const block = sliceBetween(plain, new RegExp(String.raw`Article ${article}\.\s`), [
    new RegExp(String.raw`Article ${article + 1}\.\s`),
    /The Summa Theologi(?:æ|ae) of St\. Thomas Aquinas/,
  ]);
  if (!block) return null;
  const title = block.match(/^Article \d+\.\s+(Whether[^?]{3,300}\?)/)?.[1];
  const respondeo = sliceBetween(block, /I answer that,?\s/, [/Reply to Objection 1\./]);
  return { title, respondeo: respondeo ?? block };
}

function extractSpanish(plain: string, article: number): ArticleParts | null {
  const block = sliceBetween(plain, new RegExp(String.raw`Artículo\s+${article}\s*:`), [
    new RegExp(String.raw`Artículo\s+${article + 1}\s*:`),
    /Suma Teológica de Santo Tomás de Aquino/,
  ]);
  if (!block) return null;
  const title = block.match(/^Artículo\s+\d+\s*:\s*([^?]{3,300}\?)/)?.[1]?.trim();
  const respondeo = sliceBetween(block, /Respondo:\s*/, [/A las objeciones:/]);
  return { title, respondeo: respondeo ?? block };
}

// Etiquetas de referencia de Corpus Thomisticum, p. ej. "[37592] Iª-IIae q. 94 a. 2 co."
const CT_LABEL = /\[\d+\]\s*\S+\s+q\.\s*\d+\s+(?:a\.\s*\d+\s+)?(?:arg\.\s*\d+|s\.\s*c\.|co\.|ad\s*\d+|pr\.)\s*/g;

function extractLatin(plain: string, article: number): ArticleParts | null {
  const block = sliceBetween(plain, new RegExp(String.raw`Articulus\s+${article}(?!\d)`), [
    new RegExp(String.raw`Articulus\s+${article + 1}(?!\d)`),
    /©\s*\d{4}\s*Fundaci/,
  ]);
  if (!block) return null;
  const clean = block.replace(CT_LABEL, "").replace(/\s+/g, " ");
  const respondeo = sliceBetween(clean, /Respondeo dicendum/i, [/Ad primum/]);
  return { respondeo: respondeo ?? clean };
}

/** Extrae título y corpus (respondeo) de un artículo a partir del HTML de la cuestión. */
export function extractSummaArticle(
  html: string,
  article: number,
  language: SummaLanguage,
  maxChars = 1800,
): { title?: string; text: string } | null {
  const plain = htmlToPlainText(html);
  const parts =
    language === "es" ? extractSpanish(plain, article) : language === "la" ? extractLatin(plain, article) : extractEnglish(plain, article);
  if (!parts || parts.respondeo.length < 40) return null;
  return { title: parts.title, text: truncateAtSentence(parts.respondeo, maxChars) };
}

const MAX_CACHE_ENTRIES = 200;
const globalForSummaCache = globalThis as unknown as { __st_summaHtmlCache?: Map<string, string> };
const htmlCache = globalForSummaCache.__st_summaHtmlCache ?? new Map<string, string>();
globalForSummaCache.__st_summaHtmlCache = htmlCache;

async function fetchHtmlCached(url: string, timeoutMs: number): Promise<string> {
  const cached = htmlCache.get(url);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "StoTomasApp/1.0 (+https://github.com/jpviola/santoTomasApp)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    if (htmlCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = htmlCache.keys().next().value;
      if (oldest !== undefined) htmlCache.delete(oldest);
    }
    htmlCache.set(url, html);
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Descarga el texto real de un artículo de la Summa en el idioma pedido:
 * EN → New Advent (trad. dominicos 1920), ES → hjg.com.ar (BAC), LA → Corpus Thomisticum.
 * Devuelve null si el sitio no responde o el artículo no existe (cita inválida).
 */
export async function fetchSummaArticle(
  c: StCitation,
  language: SummaLanguage,
  options: { timeoutMs?: number; maxChars?: number } = {},
): Promise<SummaArticleText | null> {
  const questionUrl = buildQuestionUrl(c, language);
  try {
    const html = await fetchHtmlCached(questionUrl, options.timeoutMs ?? 4000);
    const extracted = extractSummaArticle(html, c.article, language, options.maxChars);
    if (!extracted) return null;
    return { ...extracted, url: buildArticleUrl(c, language) };
  } catch (error) {
    logger.warn("Could not fetch Summa article text", {
      citation: formatStCitation(c),
      language,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
