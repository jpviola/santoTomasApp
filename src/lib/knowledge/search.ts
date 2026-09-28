import { embeddingIndex as defaultIndex, knowledge as defaultBundle } from "@/lib/knowledge/bundle";
import { findPhrase, normalizeText, tokenize, tokensMatch } from "@/lib/knowledge/lexical";
import type { EmbeddingIndex, KnowledgeArticle, KnowledgeBundle, KnowledgeConcept } from "@/lib/knowledge/types";
import { cosine, embedQuery } from "@/lib/llm/embeddings";

/**
 * Búsqueda híbrida sobre el bundle OKF:
 *   1. léxica  — palabras clave, títulos y resúmenes (bilingüe, sin tildes, con plurales);
 *   2. conceptos — etiquetas de la ontología (ES/EN/LA) encontradas en la pregunta;
 *   3. grafo   — textos de los conceptos encontrados y, con menos peso, de sus vecinos;
 *   4. semántica — similitud de embeddings (solo si hay índice y EMBEDDING_API_KEY).
 * Las listas se combinan con Reciprocal Rank Fusion (RRF).
 */

export type Signal = "lexical" | "concept" | "graph" | "semantic";
export type ArticleHit = { article: KnowledgeArticle; score: number; signals: Signal[] };
export type ConceptMatch = { concept: KnowledgeConcept; via: "label" | "semantic" | "inferred" };
export type KnowledgeSearchResult = { articles: ArticleHit[]; concepts: ConceptMatch[]; semantic: boolean };

type SearchOptions = {
  limit?: number;
  conceptLimit?: number;
  /** Puntaje léxico mínimo para que un texto sea candidato por sí solo (3 = una palabra clave). */
  minLexicalScore?: number;
  minArticleSimilarity?: number;
  minConceptSimilarity?: number;
  /** Inyectables para tests. */
  bundle?: KnowledgeBundle;
  embeddings?: EmbeddingIndex;
  embed?: (query: string, model: string, dimensions: number) => Promise<number[] | null>;
};

const RRF_K = 60;
const MAX_GRAPH_NEIGHBORS = 10;
const WEIGHTS: Record<Signal, number> = { lexical: 1, semantic: 1, concept: 1, graph: 0.5 };

type IndexedArticle = { article: KnowledgeArticle; keywordTokens: string[]; titleTokens: string[]; textTokens: string[]; phrases: string[] };

const lexicalIndexCache = new WeakMap<KnowledgeBundle, IndexedArticle[]>();

function lexicalIndex(bundle: KnowledgeBundle): IndexedArticle[] {
  const cached = lexicalIndexCache.get(bundle);
  if (cached) return cached;
  const conceptById = new Map(bundle.concepts.map((c) => [c.id, c]));
  const index = bundle.articles
    .filter((a) => a.status !== "deprecated")
    .map((article) => {
      // Las etiquetas de los conceptos centrales del texto cuentan como palabras clave
      // (no las de conceptos que solo se mencionan en el título: meten ruido).
      const conceptLabels = article.coreConcepts.flatMap((id) => {
        const c = conceptById.get(id);
        return c ? [...c.labels.es, ...c.labels.en, ...c.labels.la] : [];
      });
      const keywords = [...article.keywords, ...conceptLabels];
      return {
        article,
        keywordTokens: [...new Set(keywords.flatMap(tokenize))],
        titleTokens: [...new Set(tokenize(article.title))],
        textTokens: [...new Set(tokenize(article.text))],
        phrases: keywords.filter((k) => k.includes(" ")),
      };
    });
  lexicalIndexCache.set(bundle, index);
  return index;
}

/** Proporción del mejor puntaje léxico que debe alcanzar un texto para no ser ruido. */
const RELATIVE_LEXICAL_CUTOFF = 0.6;

/** Ranking léxico: devuelve [id, puntaje] ordenado, con puntaje >= minScore y >= 60% del mejor. */
export function lexicalRanking(query: string, bundle: KnowledgeBundle = defaultBundle, minScore = 3): [string, number][] {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return [];
  const normalized = normalizeText(query);
  return lexicalIndex(bundle)
    .map((entry): [string, number] => {
      let score = 0;
      for (const token of queryTokens) {
        if (entry.keywordTokens.some((k) => tokensMatch(token, k))) score += 3;
        else if (entry.titleTokens.some((t) => tokensMatch(token, t))) score += 2;
        else if (entry.textTokens.some((t) => tokensMatch(token, t))) score += 1;
      }
      for (const phrase of entry.phrases) if (findPhrase(normalized, phrase) >= 0) score += 3;
      return [entry.article.id, score];
    })
    .filter(([, score]) => score >= minScore)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score], _, ranked) => score >= ranked[0][1] * RELATIVE_LEXICAL_CUTOFF);
}

/**
 * Conceptos cuyas etiquetas aparecen en la pregunta como palabras completas.
 * Si una coincidencia queda dentro de otra más larga («bien» dentro de «bien común»), se descarta.
 */
export function matchConceptLabels(query: string, bundle: KnowledgeBundle = defaultBundle): KnowledgeConcept[] {
  const normalized = normalizeText(query);
  const matches: { concept: KnowledgeConcept; start: number; end: number }[] = [];
  for (const concept of bundle.concepts) {
    if (concept.status === "deprecated") continue;
    let best: { start: number; end: number } | null = null;
    for (const label of [...concept.labels.es, ...concept.labels.en, ...concept.labels.la]) {
      const start = findPhrase(normalized, label);
      if (start < 0) continue;
      const end = start + normalizeText(label).length;
      if (!best || end - start > best.end - best.start) best = { start, end };
    }
    if (best) matches.push({ concept, ...best });
  }
  return matches
    .filter((m) => !matches.some((o) => o !== m && o.start <= m.start && o.end >= m.end && o.end - o.start > m.end - m.start))
    .sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)
    .map((m) => m.concept);
}

export async function searchKnowledge(query: string, options: SearchOptions = {}): Promise<KnowledgeSearchResult> {
  const bundle = options.bundle ?? defaultBundle;
  const index = options.embeddings ?? defaultIndex;
  const embed = options.embed ?? embedQuery;
  const limit = options.limit ?? 4;
  const articleById = new Map(bundle.articles.filter((a) => a.status !== "deprecated").map((a) => [a.id, a]));
  const conceptById = new Map(bundle.concepts.map((c) => [c.id, c]));

  const lists: Partial<Record<Signal, string[]>> = {};
  const eligible = new Set<string>();

  // 1. Léxica
  const lexical = lexicalRanking(query, bundle, options.minLexicalScore ?? 3);
  lists.lexical = lexical.map(([id]) => id);
  lexical.forEach(([id]) => eligible.add(id));

  // 2. Conceptos por etiqueta
  const labelConcepts = matchConceptLabels(query, bundle);

  // 4. Semántica (antes del grafo: también puede aportar conceptos)
  let semantic = false;
  const semanticConcepts: KnowledgeConcept[] = [];
  if (index.model && index.dimensions > 0 && Object.keys(index.items).length > 0) {
    const vector = await embed(query, index.model, index.dimensions);
    if (vector) {
      semantic = true;
      const scored = Object.entries(index.items).map(([key, item]) => [key, cosine(vector, item.vector)] as const);
      const articleSims = scored
        .filter(([key, sim]) => key.startsWith("article:") && sim >= (options.minArticleSimilarity ?? 0.3))
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key.slice("article:".length))
        .filter((id) => articleById.has(id));
      lists.semantic = articleSims;
      articleSims.forEach((id) => eligible.add(id));
      scored
        .filter(([key, sim]) => key.startsWith("concept:") && sim >= (options.minConceptSimilarity ?? 0.35))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([key]) => {
          const concept = conceptById.get(key.slice("concept:".length));
          if (concept) semanticConcepts.push(concept);
        });
    }
  }

  // 3. Grafo: textos de los conceptos encontrados y de sus vecinos
  const direct = [...new Map([...labelConcepts, ...semanticConcepts].map((c) => [c.id, c])).values()];
  const directIds = new Set(direct.map((c) => c.id));
  // Orden dentro de un concepto: cuántos conceptos buscados lo tienen como central, después el orden por niveles
  // que calcula el compilador (curados, títulos que nombran el concepto, su tratado…), después la posición léxica.
  const lexicalRank = new Map(lexical.map(([id], rank) => [id, rank]));
  const countTags = (ids: Set<string>) => {
    const counts = new Map<string, { core: number; best: number }>();
    for (const conceptId of ids) {
      (conceptById.get(conceptId)?.articles ?? []).forEach((articleId, position) => {
        const article = articleById.get(articleId);
        if (!article) return;
        const entry = counts.get(articleId) ?? { core: 0, best: Number.MAX_SAFE_INTEGER };
        if (article.coreConcepts.includes(conceptId)) entry.core += 1;
        entry.best = Math.min(entry.best, position);
        counts.set(articleId, entry);
      });
    }
    const lexicalPosition = (id: string) => lexicalRank.get(id) ?? Number.MAX_SAFE_INTEGER;
    return [...counts.entries()]
      .sort((a, b) => b[1].core - a[1].core || a[1].best - b[1].best || lexicalPosition(a[0]) - lexicalPosition(b[0]))
      .map(([id]) => id);
  };
  lists.concept = countTags(directIds);
  lists.concept.forEach((id) => eligible.add(id));
  const neighborIds = new Set(
    direct.flatMap((c) => [...c.broader, ...c.narrower, ...c.related]).filter((id) => !directIds.has(id)),
  );
  // Los vecinos solo aportan contexto curado, y con tope, para no inundar con fragmentos.
  lists.graph = countTags(neighborIds)
    .filter((id) => !lists.concept!.includes(id) && articleById.get(id)?.textKind === "summary")
    .slice(0, MAX_GRAPH_NEIGHBORS);
  lists.graph.forEach((id) => eligible.add(id));

  // Fusión RRF
  const scores = new Map<string, { score: number; signals: Signal[] }>();
  for (const [signal, ids] of Object.entries(lists) as [Signal, string[]][]) {
    ids.forEach((id, rank) => {
      if (!eligible.has(id)) return;
      const entry = scores.get(id) ?? { score: 0, signals: [] };
      entry.score += WEIGHTS[signal] / (RRF_K + rank + 1);
      entry.signals.push(signal);
      scores.set(id, entry);
    });
  }
  const articles: ArticleHit[] = [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id, { score, signals }]) => ({ article: articleById.get(id)!, score, signals }));

  // Conceptos para el prompt: los encontrados y, si faltan, los del mejor texto.
  const concepts: ConceptMatch[] = [
    ...labelConcepts.map((concept) => ({ concept, via: "label" as const })),
    ...semanticConcepts.filter((c) => !labelConcepts.includes(c)).map((concept) => ({ concept, via: "semantic" as const })),
  ];
  if (concepts.length < 2 && articles[0]) {
    for (const id of articles[0].article.concepts) {
      const concept = conceptById.get(id);
      if (concept && !concepts.some((m) => m.concept.id === id)) concepts.push({ concept, via: "inferred" });
      if (concepts.length >= 2) break;
    }
  }

  return { articles, concepts: concepts.slice(0, options.conceptLimit ?? 3), semantic };
}
