import type { OntologyTerm } from "@/lib/agents/OntologyEngine";
import type { SourceSnippet } from "@/lib/schemas/debate";
import { getCorpusEntry, hydrateAquinasSources, retrieveAquinasSources, toSnippet } from "@/lib/retrieval/aquinasRetriever";
import { retrieveOntologySources } from "@/lib/retrieval/ontologyRetriever";
import { buildArticleUrl, formatStCitation, parseStCitation, stSourceId, type SummaLanguage } from "@/lib/retrieval/summaText";

type RetrieveSourcesParams = {
  question: string;
  language: SummaLanguage;
  /** Palabras clave sugeridas por el moderador (EN/ES). */
  keywords?: string[];
  /** Artículos de la Summa propuestos por el moderador. */
  candidateLoci?: string[];
  ontologyTerms?: OntologyTerm[];
  maxSources?: number;
};

const MAX_MODEL_LOCI = 4;

/**
 * Convierte las citas propuestas por el modelo en fuentes. Si la cita está en el
 * corpus se usa su resumen; si no, queda sin texto y solo sobrevive si la
 * hidratación encuentra el artículo real (así se descartan citas inventadas).
 */
export function lociToSources(candidateLoci: string[]): SourceSnippet[] {
  const seen = new Set<string>();
  const sources: SourceSnippet[] = [];
  for (const locus of candidateLoci) {
    const citation = parseStCitation(locus);
    if (!citation) continue;
    const id = stSourceId(citation);
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = getCorpusEntry(id);
    sources.push(
      entry
        ? toSnippet(entry)
        : {
            id,
            title: formatStCitation(citation),
            citation: formatStCitation(citation),
            text: "",
            url: buildArticleUrl(citation, "en"),
            kind: "text",
          },
    );
    if (sources.length >= MAX_MODEL_LOCI) break;
  }
  return sources;
}

export async function retrieveSourcesForDebate({
  question,
  language,
  keywords = [],
  candidateLoci = [],
  ontologyTerms = [],
  maxSources = 6,
}: RetrieveSourcesParams): Promise<SourceSnippet[]> {
  const fromModel = lociToSources(candidateLoci);
  const fromCorpus = retrieveAquinasSources([question, ...keywords].join(" "), 4);
  const fromOntology = await retrieveOntologySources(ontologyTerms);

  const merged: SourceSnippet[] = [];
  const seen = new Set<string>();
  for (const source of [...fromModel, ...fromCorpus, ...fromOntology]) {
    if (seen.has(source.id)) continue;
    seen.add(source.id);
    merged.push(source);
  }

  // Se hidrata con margen: algunas citas del modelo pueden no verificarse.
  const hydrated = await hydrateAquinasSources(merged.slice(0, maxSources + 2), language);
  return hydrated.slice(0, maxSources);
}
