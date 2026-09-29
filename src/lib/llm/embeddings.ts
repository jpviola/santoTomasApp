import OpenAI from "openai";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";

/**
 * Embeddings de la base de conocimiento. Siempre 1024 dimensiones: es el tamaño de la columna en Postgres.
 *
 * Proveedores (EMBEDDING_PROVIDER elige uno; si no está, se detecta por las credenciales presentes):
 *   gemini      GEMINI_API_KEY          gemini-embedding-001     gratis (AI Studio), multilingüe
 *   jina        JINA_API_KEY            jina-embeddings-v5-text-small   10M tokens gratis, solo uso no comercial
 *   openrouter  OPENROUTER_API_KEY      baai/bge-m3              pago (muy barato), multilingüe
 *   openai-compatible  EMBEDDING_API_KEY (+ EMBEDDING_BASE_URL)  text-embedding-3-small
 *   neon-ai-gateway    NEON_AI_GATEWAY_TOKEN + NEON_AI_GATEWAY_BASE_URL  qwen3-embedding-0-6b
 * EMBEDDING_MODEL cambia el modelo del proveedor elegido.
 *
 * Gemini y Jina distinguen consultas de documentos (búsqueda asimétrica), lo que mejora la recuperación:
 * por eso se llaman por su API nativa y no por la compatible con OpenAI.
 */
export const EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingProvider = "gemini" | "jina" | "openrouter" | "openai-compatible" | "neon-ai-gateway";
export type EmbeddingPurpose = "document" | "query";
export type EmbeddingConfig = { provider: EmbeddingProvider; apiKey: string; baseURL: string; model: string };
type Env = Record<string, string | undefined>;

const PROVIDERS: Record<EmbeddingProvider, (env: Env) => EmbeddingConfig | null> = {
  gemini: (env) =>
    env.GEMINI_API_KEY
      ? { provider: "gemini", apiKey: env.GEMINI_API_KEY, baseURL: "https://generativelanguage.googleapis.com/v1beta", model: env.EMBEDDING_MODEL || "gemini-embedding-001" }
      : null,
  jina: (env) =>
    env.JINA_API_KEY
      ? { provider: "jina", apiKey: env.JINA_API_KEY, baseURL: "https://api.jina.ai/v1", model: env.EMBEDDING_MODEL || "jina-embeddings-v5-text-small" }
      : null,
  openrouter: (env) => {
    const apiKey = env.EMBEDDING_API_KEY || env.OPENROUTER_API_KEY || env.OPENAI_API_KEY;
    return apiKey ? { provider: "openrouter", apiKey, baseURL: "https://openrouter.ai/api/v1", model: env.EMBEDDING_MODEL || "baai/bge-m3" } : null;
  },
  "openai-compatible": (env) =>
    env.EMBEDDING_API_KEY
      ? {
          provider: "openai-compatible",
          apiKey: env.EMBEDDING_API_KEY,
          baseURL: env.EMBEDDING_BASE_URL || "https://api.openai.com/v1",
          model: env.EMBEDDING_MODEL || "text-embedding-3-small",
        }
      : null,
  "neon-ai-gateway": (env) =>
    env.NEON_AI_GATEWAY_TOKEN && env.NEON_AI_GATEWAY_BASE_URL
      ? {
          provider: "neon-ai-gateway",
          apiKey: env.NEON_AI_GATEWAY_TOKEN,
          baseURL: `${env.NEON_AI_GATEWAY_BASE_URL.replace(/\/+$/, "")}/v1`,
          model: env.EMBEDDING_MODEL || "qwen3-embedding-0-6b",
        }
      : null,
};

export function embeddingConfig(env: Env = process.env): EmbeddingConfig | null {
  const explicit = env.EMBEDDING_PROVIDER as EmbeddingProvider | undefined;
  if (explicit) return explicit in PROVIDERS ? PROVIDERS[explicit](env) : null;
  // Detección por credenciales, de la más específica a la más general.
  for (const provider of ["openai-compatible", "neon-ai-gateway", "gemini", "jina"] as const) {
    const config = PROVIDERS[provider](env);
    if (config) return config;
  }
  return null;
}

/** Modelos que aceptan el parámetro `dimensions` en la API compatible con OpenAI. */
export const acceptsDimensionsParam = (model: string) => /text-embedding-3|qwen3-embedding|gemini-embedding/i.test(model);

const normalize = (vector: number[]) => {
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
  return norm > 0 ? vector.map((x) => x / norm) : vector;
};

class EmbeddingHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!response.ok) {
    throw new EmbeddingHttpError(`${response.status} ${(await response.text()).slice(0, 300)}`, response.status);
  }
  return response.json();
}

// Gemini: batchEmbedContents con taskType y outputDimensionality. gemini-embedding-001 no normaliza
// dimensiones truncadas, así que se normaliza acá.
async function geminiEmbed(texts: string[], config: EmbeddingConfig, purpose: EmbeddingPurpose): Promise<number[][]> {
  const model = config.model.startsWith("models/") ? config.model : `models/${config.model}`;
  const data = (await postJson(`${config.baseURL}/${model}:batchEmbedContents`, { "x-goog-api-key": config.apiKey }, {
    requests: texts.map((text) => ({
      model,
      content: { parts: [{ text }] },
      taskType: purpose === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    })),
  })) as { embeddings: { values: number[] }[] };
  return data.embeddings.map((e) => normalize(e.values));
}

// Jina: API propia (parecida a la de OpenAI) con `task` para consultas y pasajes.
async function jinaEmbed(texts: string[], config: EmbeddingConfig, purpose: EmbeddingPurpose): Promise<number[][]> {
  const data = (await postJson(`${config.baseURL}/embeddings`, { Authorization: `Bearer ${config.apiKey}` }, {
    model: config.model,
    input: texts,
    task: purpose === "query" ? "retrieval.query" : "retrieval.passage",
    dimensions: EMBEDDING_DIMENSIONS,
    normalized: true,
    truncate: true,
  })) as { data: { index: number; embedding: number[] }[] };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

const clients = new Map<string, OpenAI>();

async function openAiCompatibleEmbed(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
  const key = `${config.baseURL}|${config.apiKey}`;
  let client = clients.get(key);
  if (!client) {
    client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    clients.set(key, client);
  }
  const response = await client.embeddings.create({
    model: config.model,
    input: texts,
    ...(acceptsDimensionsParam(config.model) ? { dimensions: EMBEDDING_DIMENSIONS } : {}),
    // Neon avisa que sin esto algunas versiones del SDK devuelven vectores en cero.
    encoding_format: "float",
  });
  return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

const isRetryable = (error: unknown) => {
  const status = error instanceof EmbeddingHttpError ? error.status : (error as { status?: number })?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
};

export async function embedTexts(
  texts: string[],
  config: EmbeddingConfig,
  purpose: EmbeddingPurpose = "document",
  retry: { maxAttempts: number; initialDelayMs: number } = { maxAttempts: 6, initialDelayMs: 5000 },
): Promise<number[][]> {
  const vectors = await withRetry(
    () =>
      config.provider === "gemini"
        ? geminiEmbed(texts, config, purpose)
        : config.provider === "jina"
          ? jinaEmbed(texts, config, purpose)
          : openAiCompatibleEmbed(texts, config),
    { operationName: `embeddings-${config.provider}`, ...retry, backoffMultiplier: 2, shouldRetry: isRetryable },
  );
  if (vectors.length !== texts.length) throw new Error(`Se esperaban ${texts.length} embeddings y llegaron ${vectors.length}.`);
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
    // En una consulta en vivo no se espera: un solo intento.
    const [vector] = await embedTexts([query], config, "query", { maxAttempts: 1, initialDelayMs: 0 });
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
