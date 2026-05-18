import type { SourceSnippet } from "@/lib/schemas/debate";
import { ontologyEngine, type OntologyTerm } from "@/lib/agents/OntologyEngine";
import { retrieveAquinasSources } from "./aquinasRetriever";

type OntologyEnrichedSnippet = SourceSnippet & {
  ontologyTerms: string[];
  relatedArticles: string[];
};

export async function retrieveOntologyEnrichedSources(
  question: string,
  topK = 5,
  knownTerms?: OntologyTerm[],
): Promise<SourceSnippet[]> {
  const relevantTerms = knownTerms ?? await ontologyEngine.findRelevantTerms(question);
  
  if (relevantTerms.length === 0) {
    return retrieveAquinasSources(question, topK);
  }

  const articlePromises = relevantTerms
    .slice(0, 3)
    .map(term => ontologyEngine.getArticlesByTopic(term.id));
  
  const articleResults = await Promise.all(articlePromises);
  const allArticles = articleResults.flat();
  
  const uniqueArticleIds = [...new Set(allArticles.map(a => a.id))];
  
  const baseSources = await retrieveAquinasSources(question, topK);
  
  const enriched: OntologyEnrichedSnippet[] = baseSources.map(source => ({
    ...source,
    ontologyTerms: relevantTerms.map(t => t.name),
    relatedArticles: uniqueArticleIds.filter(id => id !== source.id).slice(0, 3),
  }));

  const ontologyContext: SourceSnippet[] = relevantTerms.slice(0, 2).map(term => ({
    id: `ontology:${term.id}`,
    title: `Concepto: ${term.name}`,
    citation: "Ontología StoTomas",
    text: term.description,
  }));

  const relatedArticleSources: SourceSnippet[] = allArticles
    .slice(0, 2)
    .map(article => ({
      id: `graphdb:${article.id}`,
      title: article.title,
      citation: article.citation,
      text: article.text,
    }));

  const combined = [...ontologyContext, ...relatedArticleSources, ...enriched];
  
  return combined.slice(0, topK);
}
