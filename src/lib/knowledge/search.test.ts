import { describe, expect, it } from "vitest";
import { matchConceptLabels, searchKnowledge } from "@/lib/knowledge/search";
import type { EmbeddingIndex, KnowledgeArticle, KnowledgeBundle, KnowledgeConcept } from "@/lib/knowledge/types";

const NO_EMBEDDINGS: EmbeddingIndex = { model: null, dimensions: 0, items: {} };

describe("matchConceptLabels", () => {
  it("prefers the longest label (bien común, not bien)", () => {
    expect(matchConceptLabels("¿Qué es el bien común?").map((c) => c.id)).toEqual(["bien-comun"]);
  });

  it("matches Spanish, English and Latin labels as whole words, without accents", () => {
    expect(matchConceptLabels("¿Qué es la sindéresis?").map((c) => c.id)).toContain("sinderesis");
    expect(matchConceptLabels("What is natural law?").map((c) => c.id)).toContain("ley-natural");
    expect(matchConceptLabels("lex naturalis").map((c) => c.id)).toContain("ley-natural");
    expect(matchConceptLabels("claramente").map((c) => c.id)).not.toContain("alma");
  });
});

describe("searchKnowledge on the real bundle", () => {
  it("finds texts through the concept graph", async () => {
    const result = await searchKnowledge("¿Qué es la sindéresis?", { embeddings: NO_EMBEDDINGS });
    expect(result.concepts[0]?.concept.id).toBe("sinderesis");
    expect(result.articles.map((h) => h.article.id)).toContain("st-i-q79-a12");
    expect(result.semantic).toBe(false);
  });

  it("returns nothing for an off-topic query", async () => {
    const result = await searchKnowledge("receta de pizza napolitana", { embeddings: NO_EMBEDDINGS });
    expect(result.articles).toEqual([]);
  });
});

// Bundle mínimo para aislar cada señal.
const mkConcept = (id: string, labels: string[], rel: Partial<KnowledgeConcept> = {}): KnowledgeConcept => ({
  id, title: id, description: `${id} desc`, descriptionEn: "", area: "a", labels: { es: labels, en: [], la: [] },
  definition: "", broader: [], narrower: [], related: [], articles: [], questions: [], status: "stable", trust: "unverified", ...rel,
});
const mkArticle = (id: string, concepts: string[], text = "texto neutro"): KnowledgeArticle => ({
  id, title: id, description: "", citation: id, work: "w", textKind: "summary", text, concepts, coreConcepts: concepts, keywords: ["zzz"], status: "stable", trust: "unverified",
});
const bundle: KnowledgeBundle = {
  okfVersion: "0.2",
  areas: [], authors: [], works: [], questions: [],
  concepts: [
    mkConcept("conciencia", ["conciencia"], { related: ["sinderesis"], articles: ["a-conciencia"] }),
    mkConcept("sinderesis", ["sinderesis"], { related: ["conciencia"], articles: ["a-sinderesis"] }),
    mkConcept("otro", ["otro tema"], { articles: ["a-otro"] }),
  ],
  articles: [mkArticle("a-conciencia", ["conciencia"]), mkArticle("a-sinderesis", ["sinderesis"]), mkArticle("a-otro", ["otro"])],
};

describe("searchKnowledge signals", () => {
  it("ranks direct concept texts above graph neighbours", async () => {
    const result = await searchKnowledge("conciencia", { bundle, embeddings: NO_EMBEDDINGS });
    expect(result.articles.map((h) => h.article.id)).toEqual(["a-conciencia", "a-sinderesis"]);
    expect(result.articles[1].signals).toEqual(["graph"]);
  });

  it("adds semantic matches when an index and a query embedding are available", async () => {
    const embeddings: EmbeddingIndex = {
      model: "test-model",
      dimensions: 2,
      items: {
        "article:a-otro": { hash: "h", vector: [1, 0] },
        "article:a-conciencia": { hash: "h", vector: [0, 1] },
        "concept:otro": { hash: "h", vector: [1, 0] },
      },
    };
    const result = await searchKnowledge("una pregunta sin palabras clave", {
      bundle,
      embeddings,
      embed: async () => [1, 0],
    });
    expect(result.semantic).toBe(true);
    expect(result.articles[0].article.id).toBe("a-otro");
    expect(result.articles[0].signals).toEqual(expect.arrayContaining(["semantic", "concept"]));
    expect(result.concepts[0]).toMatchObject({ via: "semantic" });
  });

  it("degrades to lexical and graph search when the query cannot be embedded", async () => {
    const embeddings: EmbeddingIndex = { model: "m", dimensions: 2, items: { "article:a-otro": { hash: "h", vector: [1, 0] } } };
    const result = await searchKnowledge("conciencia", { bundle, embeddings, embed: async () => null });
    expect(result.semantic).toBe(false);
    expect(result.articles[0].article.id).toBe("a-conciencia");
  });
});
