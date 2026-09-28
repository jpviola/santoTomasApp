import bundleData from "@/data/knowledge/bundle.json";
import type { KnowledgeArticle, KnowledgeBundle, KnowledgeConcept } from "@/lib/knowledge/types";

/** Bundle compilado desde knowledge/ por `npm run knowledge:build`. */
export const knowledge = bundleData as KnowledgeBundle;

const articleById = new Map(knowledge.articles.map((a) => [a.id, a]));
const conceptById = new Map(knowledge.concepts.map((c) => [c.id, c]));

export function getArticle(id: string): KnowledgeArticle | undefined {
  return articleById.get(id);
}

export function getConcept(id: string): KnowledgeConcept | undefined {
  return conceptById.get(id);
}

/** Vecinos en la ontología: más amplios, más específicos y relacionados. */
export function conceptNeighbors(id: string): string[] {
  const concept = conceptById.get(id);
  if (!concept) return [];
  return [...new Set([...concept.broader, ...concept.narrower, ...concept.related])];
}

/** Texto de un concepto para el prompt: título y definición breve en el idioma pedido. */
export function describeConcept(concept: KnowledgeConcept, language: "en" | "es" | "la"): string {
  return `${concept.title}: ${language === "es" ? concept.description : concept.descriptionEn || concept.description}`;
}
