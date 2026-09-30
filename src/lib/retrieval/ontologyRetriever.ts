import type { SourceSnippet } from "@/lib/schemas/debate";
import { getOntologyEngine, type OntologyTerm } from "@/lib/agents/OntologyEngine";
import { retrieveAquinasSources } from "./aquinasRetriever";

/**
 * Fuentes aportadas por GraphDB: definiciones de conceptos y artículos vinculados.
 * Devuelve [] cuando GraphDB no está configurado o no hay términos.
 */
export async function retrieveOntologySources(terms: OntologyTerm[], limit = 2): Promise<SourceSnippet[]> {
  if (terms.length === 0) return [];

  const articleResults = await Promise.all(
    terms.slice(0, 3).map((term) => getOntologyEngine().getArticlesByTopic(term.id)),
  );

  const conceptSources: SourceSnippet[] = terms.slice(0, 1).map((term) => ({
    id: `ontology:${term.id}`,
    title: `Concepto: ${term.name}`,
    citation: "Ontología StoTomas",
    text: term.description,
    kind: "summary",
  }));

  const articleSources: SourceSnippet[] = articleResults
    .flat()
    .filter((article) => article.text)
    .map((article) => ({
      id: `graphdb:${article.id}`,
      title: article.title,
      citation: article.citation,
      text: article.text,
      kind: "summary",
    }));

  return [...conceptSources, ...articleSources].slice(0, limit);
}

/** Corpus local + contexto de la ontología (usado por scripts/testGraphDbIntegration.ts). */
export async function retrieveOntologyEnrichedSources(
  question: string,
  topK = 5,
  knownTerms?: OntologyTerm[],
): Promise<SourceSnippet[]> {
  const relevantTerms = knownTerms ?? (await getOntologyEngine().findRelevantTerms(question));
  const ontologySources = await retrieveOntologySources(relevantTerms);
  return [...ontologySources, ...retrieveAquinasSources(question, topK)].slice(0, topK);
}
