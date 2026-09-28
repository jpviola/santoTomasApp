/** Nivel de confianza derivado de `verified` según OKF v0.2 §5.3. */
export type TrustTier = "unverified" | "machine-confirmed" | "human-reviewed";
export type Lifecycle = "draft" | "stable" | "deprecated";

export type KnowledgeArticle = {
  id: string;
  title: string;
  description: string;
  citation: string;
  work: string;
  url?: string;
  /** "summary": resumen curado (no es cita); "excerpt": fragmento textual del respondeo (trad. 1920). */
  textKind: "summary" | "excerpt";
  text: string;
  /** Cuestión de la Summa a la que pertenece (id en cuestiones/), si existe en el bundle. */
  question?: string;
  concepts: string[];
  /** Conceptos centrales: los del tratado (cuestión) o, en textos curados, todos. Los demás vienen de menciones en el título. */
  coreConcepts: string[];
  keywords: string[];
  status: Lifecycle;
  trust: TrustTier;
};

export type KnowledgeConcept = {
  id: string;
  title: string;
  description: string;
  descriptionEn: string;
  area: string;
  labels: { es: string[]; en: string[]; la: string[] };
  /** Texto del cuerpo (sin secciones generadas), útil como contexto para el modelo. */
  definition: string;
  broader: string[];
  narrower: string[];
  related: string[];
  articles: string[];
  questions: string[];
  status: Lifecycle;
  trust: TrustTier;
};

export type KnowledgeQuestion = {
  id: string;
  title: string;
  citation: string;
  treatise: string;
  url?: string;
  concepts: string[];
  articles: string[];
};

export type KnowledgeArea = { id: string; title: string; titleEn: string; description: string };
export type KnowledgeAuthor = { id: string; title: string; description: string; dates: string; concepts: string[] };
export type KnowledgeWork = { id: string; title: string; description: string; url?: string };

export type KnowledgeBundle = {
  okfVersion: string;
  articles: KnowledgeArticle[];
  questions: KnowledgeQuestion[];
  concepts: KnowledgeConcept[];
  areas: KnowledgeArea[];
  authors: KnowledgeAuthor[];
  works: KnowledgeWork[];
};

export type EmbeddingIndex = {
  model: string | null;
  dimensions: number;
  /** Clave "article:<id>" o "concept:<id>". */
  items: Record<string, { hash: string; vector: number[] }>;
};
