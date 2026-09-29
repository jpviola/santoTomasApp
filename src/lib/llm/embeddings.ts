import OpenAI from "openai";
import { logger } from "@/lib/utils/logger";

/**
 * Embeddings vía una API compatible con OpenAI (`/embeddings`). Proveedores, en orden de preferencia:
 *   1. EMBEDDING_PROVIDER=openrouter — reusa la key de OpenRouter (EMBEDDING_API_KEY, OPENROUTER_API_KEY u OPENAI_API_KEY);
 *      modelo por defecto baai/bge-m3 (multilingüe, 1024 dimensiones nativas)
 *   2. EMBEDDING_API_KEY (+ EMBEDDING_BASE_URL, por defecto OpenAI) — modelo por defecto text-embedding-3-small
 *   3. NEON_AI_GATEWAY_TOKEN + NEON_AI_GATEWAY_BASE_URL — modelo por defecto qwen3-embedding-0-6b (multilingüe)
 * EMBEDDING_MODEL cambia el modelo. Siempre 1024 dimensiones: es el tamaño de la columna en Postgres.
 */
export const EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  provider: "openrouter" | "openai-compatible" | "neon-ai-gateway";
};

/** Modelos que aceptan el parámetro `dimensions` (Matryoshka). A los demás no se les manda. */
export const acceptsDimensionsParam = (model: string) => /text-embedding-3|qwen3-embedding|gemini-embedding/i.test(model);

export function embeddingConfig(env: Record<string, string | undefined> = process.env): EmbeddingConfig | null {
  if (env.EMBEDDING_PROVIDER === "openrouter") {
    const apiKey = env.EMBEDDING_API_KEY || env.OPENROUTER_API_KEY || env.OPENAI_API_KEY;
    return apiKey
      ? { apiKey, baseURL: "https://openrouter.ai/api/v1", model: env.EMBEDDING_MODEL || "baai/bge-m3", provider: "openrouter" }
      : null;
  }
  if (env.EMBEDDING_API_KEY) {
    return {
      apiKey: env.EMBEDDING_API_KEY,
      baseURL: env.EMBEDDING_BASE_URL || "https://api.openai.com/v1",
      model: env.EMBEDDING_MODEL || "text-embedding-3-small",
      provider: "openai-compatible",
    };
  }
  if (env.NEON_AI_GATEWAY_TOKEN && env.NEON_AI_GATEWAY_BASE_URL) {
    return {
      apiKey: env.NEON_AI_GATEWAY_TOKEN,
      baseURL: `${env.NEON_AI_GATEWAY_BASE_URL.replace(/\/+$/, "")}/v1`,
      model: env.EMBEDDING_MODEL || "qwen3-embedding-0-6b",
      provider: "neon-ai-gateway",
    };
  }
  return null;
}

const clients = new Map<string, OpenAI>();

function clientFor(config: EmbeddingConfig): OpenAI {
  const key = `${config.baseURL}|${config.apiKey}`;
  let client = clients.get(key);
  if (!client) {
    client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    clients.set(key, client);
  }
  return client;
}

export async function embedTexts(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
  const response = await clientFor(config).embeddings.create({
    model: config.model,
    input: texts,
    ...(acceptsDimensionsParam(config.model) ? { dimensions: EMBEDDING_DIMENSIONS } : {}),
    // Neon avisa que sin esto algunas versiones del SDK devuelven vectores en cero.
    encoding_format: "float",
  });
  const vectors = response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  for (const vector of vectors) {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`El modelo ${config.model} devolvió ${vector.length} dimensiones; se esperaban ${EMBEDDING_DIMENSIONS}.`);
    }
  }
  return vectors;
}

const queryCache = new Map<string, number[]>();
const MAX_QUERY_CACHE = 200;

/** Embedding de una consulta, con caché en memoria. Devuelve null si no hay proveedor o falla. */
export async function embedQuery(query: string): Promise<{ vector: number[]; model: string } | null> {
  const config = embeddingConfig();
  if (!config) return null;
  const key = `${config.model}:${query}`;
  const cached = queryCache.get(key);
  if (cached) return { vector: cached, model: config.model };
  try {
    const [vector] = await embedTexts([query], config);
    if (queryCache.size >= MAX_QUERY_CACHE) {
      const oldest = queryCache.keys().next().value;
      if (oldest !== undefined) queryCache.delete(oldest);
    }
    queryCache.set(key, vector);
    return { vector, model: config.model };
  } catch (error) {
    logger.warn("Query embedding failed; semantic search disabled for this request", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
