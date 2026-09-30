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

export const stripAccents = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const normalizeText = (text: string) =>
  stripAccents(text.toLowerCase()).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Stemmer mínimo ES/EN: plural (-s/-es) y vocal final de género (libre/libres, bueno/buenos, virtue/virtues). */
const stem = (token: string) => {
  let t = token;
  if (t.length > 4 && t.endsWith("es")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("s")) t = t.slice(0, -1);
  if (t.length > 4 && /[aeo]$/.test(t)) t = t.slice(0, -1);
  return t;
};

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
    .map(stem);
}

const sharedPrefix = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
};

/** Iguales, uno prefijo del otro (desde 5 letras), o con 7 letras iniciales en común (determinado/determinismo). */
export const tokensMatch = (a: string, b: string) =>
  a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a))) || sharedPrefix(a, b) >= 7;

/** Busca `phrase` como palabras completas dentro de un texto ya normalizado. Devuelve la posición o -1. */
export function findPhrase(normalizedText: string, phrase: string): number {
  const target = normalizeText(phrase);
  if (!target) return -1;
  const match = new RegExp(`(?:^| )${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?= |$)`).exec(normalizedText);
  return match ? match.index + (match[0].startsWith(" ") ? 1 : 0) : -1;
}
