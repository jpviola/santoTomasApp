import SparqlClient from 'sparql-http-client/SimpleClient.js';

const ONTOLOGY_PREFIX = 'https://stotomas.ai/ontology/';

interface SparqlBinding {
  [key: string]: { value: string };
}

interface SparqlResponse {
  head: {
    vars: string[];
  };
  results: {
    bindings: SparqlBinding[];
  };
}

export interface OntologyTerm {
  id: string;
  name: string;
  description: string;
  broaderThan?: string[];
  narrowerThan?: string[];
  relatedTo?: string[];
}

export interface SummaArticleMetadata {
  id: string;
  title: string;
  citation: string;
  text: string;
  topics: string[];
}

export class OntologyEngine {
  private sparqlClient: SparqlClient | null = null;
  private graphDbEndpoint: string | null = null;
  private relevantTermsCache = new Map<string, OntologyTerm[]>();
  private articlesByTopicCache = new Map<string, SummaArticleMetadata[]>();
  private readonly queryTimeoutMs = 2500;

  constructor() {
    const endpoint = process.env.GRAPHDB_ENDPOINT_URL;
    if (endpoint) {
      this.graphDbEndpoint = endpoint;
      this.sparqlClient = new SparqlClient({ endpointUrl: this.graphDbEndpoint });
    } else {
      this.graphDbEndpoint = null;
      this.sparqlClient = null;
      console.warn("GRAPHDB_ENDPOINT_URL not set. GraphDB retrieval will be disabled.");
    }
  }

  private async executeSelect(query: string): Promise<SparqlBinding[]> {
    if (!this.sparqlClient) {
      return [];
    }

    const response = await Promise.race([
      this.sparqlClient.query.select(query),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`SPARQL query timed out after ${this.queryTimeoutMs}ms`)), this.queryTimeoutMs),
      ),
    ]);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SPARQL query failed (${response.status}): ${errorText}`);
    }
    const data = await response.json() as SparqlResponse;
    return data.results.bindings;
  }

  public async findRelevantTerms(query: string): Promise<OntologyTerm[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = this.relevantTermsCache.get(cacheKey);
    if (cached) return cached;

    const escapedQuery = query.replace(/"/g, '\\"');
    
    const sparqlQuery = `
      PREFIX schema: <http://schema.org/>
      PREFIX st: <${ONTOLOGY_PREFIX}>

      SELECT DISTINCT ?termId ?name ?nameEs ?description ?descriptionEs ?broader ?narrower ?related WHERE {
        ?termId a schema:DefinedTerm ;
                schema:name ?name ;
                schema:description ?description .
        OPTIONAL { ?termId st:nameEs ?nameEs . }
        OPTIONAL { ?termId st:descriptionEs ?descriptionEs . }
        FILTER (
          CONTAINS(LCASE(?name), LCASE("${escapedQuery}")) || 
          CONTAINS(LCASE(?description), LCASE("${escapedQuery}")) ||
          CONTAINS(LCASE(COALESCE(?nameEs, "")), LCASE("${escapedQuery}")) ||
          CONTAINS(LCASE(COALESCE(?descriptionEs, "")), LCASE("${escapedQuery}"))
        )
        OPTIONAL { ?termId st:broaderThan ?broader . }
        OPTIONAL { ?termId st:narrowerThan ?narrower . }
        OPTIONAL { ?termId st:relatedTo ?related . }
      }
      LIMIT 10
    `;

    try {
      const bindings = await this.executeSelect(sparqlQuery);
      const termsMap = new Map<string, OntologyTerm>();
      
      for (const b of bindings) {
        const id = b.termId?.value;
        if (!id) continue;
        
        if (!termsMap.has(id)) {
          termsMap.set(id, {
            id,
            name: b.nameEs?.value ?? b.name?.value ?? '',
            description: b.descriptionEs?.value ?? b.description?.value ?? '',
            broaderThan: [],
            narrowerThan: [],
            relatedTo: [],
          });
        }
        
        const term = termsMap.get(id)!;
        if (b.broader?.value && !term.broaderThan?.includes(b.broader.value)) {
          term.broaderThan = [...(term.broaderThan ?? []), b.broader.value];
        }
        if (b.narrower?.value && !term.narrowerThan?.includes(b.narrower.value)) {
          term.narrowerThan = [...(term.narrowerThan ?? []), b.narrower.value];
        }
        if (b.related?.value && !term.relatedTo?.includes(b.related.value)) {
          term.relatedTo = [...(term.relatedTo ?? []), b.related.value];
        }
      }
      
      const terms = Array.from(termsMap.values());
      this.relevantTermsCache.set(cacheKey, terms);
      return terms;
    } catch (error) {
      console.error('Error querying GraphDB for terms:', error);
      return [];
    }
  }

  public async getArticlesByTopic(topicId: string): Promise<SummaArticleMetadata[]> {
    const cleanTopicId = topicId.replace('st:', '').replace(ONTOLOGY_PREFIX, '');
    const cached = this.articlesByTopicCache.get(cleanTopicId);
    if (cached) return cached;

    const topicUri = `${ONTOLOGY_PREFIX}${cleanTopicId}`;
    
    const sparqlQuery = `
      PREFIX schema: <http://schema.org/>
      PREFIX st: <${ONTOLOGY_PREFIX}>

      SELECT ?articleId ?title ?citation ?text ?topic WHERE {
        ?articleId a st:SummaArticle ;
                   schema:name ?title ;
                   st:citation ?citation ;
                   st:hasTopic <${topicUri}> .
        OPTIONAL { ?articleId st:text ?text . }
        OPTIONAL { ?articleId st:hasTopic ?topic . }
      }
    `;
    
    try {
      const bindings = await this.executeSelect(sparqlQuery);
      const articlesMap = new Map<string, SummaArticleMetadata>();
      
      for (const b of bindings) {
        const id = b.articleId?.value;
        if (!id) continue;
        
        if (!articlesMap.has(id)) {
          articlesMap.set(id, {
            id,
            title: b.title?.value ?? '',
            citation: b.citation?.value ?? '',
            text: b.text?.value ?? '',
            topics: [],
          });
        }
        
        const article = articlesMap.get(id)!;
        if (b.topic?.value && !article.topics.includes(b.topic.value)) {
          article.topics.push(b.topic.value);
        }
      }
      
      const articles = Array.from(articlesMap.values());
      this.articlesByTopicCache.set(cleanTopicId, articles);
      return articles;
    } catch (error) {
      console.error('Error querying GraphDB for articles:', error);
      return [];
    }
  }

  public async findRelatedConcepts(termId: string): Promise<OntologyTerm[]> {
    const sparqlQuery = `
      PREFIX schema: <http://schema.org/>
      PREFIX st: <${ONTOLOGY_PREFIX}>

      SELECT ?relatedId ?name ?description WHERE {
        <${termId}> st:relatedTo ?relatedId .
        ?relatedId a schema:DefinedTerm ;
                   schema:name ?name ;
                   schema:description ?description .
      }
      LIMIT 20
    `;

    try {
      const bindings = await this.executeSelect(sparqlQuery);
      return bindings
        .filter(b => b.relatedId?.value)
        .map(b => ({
          id: b.relatedId.value,
          name: b.name?.value ?? '',
          description: b.description?.value ?? '',
        }));
    } catch (error) {
      console.error('Error querying related concepts:', error);
      return [];
    }
  }

  public getTopicIds(terms: OntologyTerm[]): string[] {
    return terms.map(t => t.id);
  }
}

let ontologyEngineInstance: OntologyEngine | null = null;

export const getOntologyEngine = (): OntologyEngine => {
  if (!ontologyEngineInstance) {
    ontologyEngineInstance = new OntologyEngine();
  }
  return ontologyEngineInstance;
};
