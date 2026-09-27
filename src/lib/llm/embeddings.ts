import OpenAI from "openai";
import { logger } from "@/lib/utils/logger";

/**
 * Embeddings vía cualquier API compatible con OpenAI (`/embeddings`).
 * Se configura aparte del chat porque el proveedor de chat (p. ej. OpenRouter) puede no ofrecer embeddings:
 *   EMBEDDING_API_KEY   (obligatoria para activar la búsqueda semántica)
 *   EMBEDDING_BASE_URL  (por defecto https://api.openai.com/v1)
 *   EMBEDDING_MODEL / EMBEDDING_DIMENSIONS  (solo al generar el índice; en ejecución manda el modelo del índice)
 */
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 512;

let client: OpenAI | null = null;

export function embeddingsConfigured(): boolean {
  return Boolean(process.env.EMBEDDING_API_KEY);
}

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.EMBEDDING_API_KEY,
      baseURL: process.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1",
    });
  }
  return client;
}

export async function embedTexts(texts: string[], model: string, dimensions: number): Promise<number[][]> {
  const response = await getClient().embeddings.create({ model, input: texts, dimensions });
  return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const queryCache = new Map<string, number[]>();
const MAX_QUERY_CACHE = 200;

/** Embedding de una consulta, con caché en memoria. Devuelve null si no hay configuración o falla. */
export async function embedQuery(query: string, model: string, dimensions: number): Promise<number[] | null> {
  if (!embeddingsConfigured()) return null;
  const key = `${model}:${dimensions}:${query}`;
  const cached = queryCache.get(key);
  if (cached) return cached;
  try {
    const [vector] = await embedTexts([query], model, dimensions);
    if (queryCache.size >= MAX_QUERY_CACHE) {
      const oldest = queryCache.keys().next().value;
      if (oldest !== undefined) queryCache.delete(oldest);
    }
    queryCache.set(key, vector);
    return vector;
  } catch (error) {
    logger.warn("Query embedding failed; semantic search disabled for this request", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
