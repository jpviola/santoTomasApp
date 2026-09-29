import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/utils/logger";

/**
 * Vectores de la base de conocimiento en Postgres + pgvector (Neon), vía el driver HTTP serverless.
 * Tabla: scripts/knowledge/schema.sql. Conexión: KNOWLEDGE_DATABASE_URL.
 */

export type VectorKind = "article" | "concept";
export type VectorRow = { key: string; kind: VectorKind; hash: string; vector: number[] };
export type Neighbor = { key: string; similarity: number };

const SCHEMA_STATEMENTS = [
  "CREATE EXTENSION IF NOT EXISTS vector",
  `CREATE TABLE IF NOT EXISTS knowledge_embeddings (
     key text PRIMARY KEY,
     kind text NOT NULL CHECK (kind IN ('article', 'concept')),
     hash text NOT NULL,
     model text NOT NULL,
     embedding vector(1024) NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  "CREATE INDEX IF NOT EXISTS knowledge_embeddings_hnsw ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops)",
];

export function vectorStoreConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.KNOWLEDGE_DATABASE_URL);
}

function sql() {
  const url = process.env.KNOWLEDGE_DATABASE_URL;
  if (!url) throw new Error("KNOWLEDGE_DATABASE_URL no está definida.");
  return neon(url);
}

/** Literal de pgvector: "[0.1,0.2,...]". */
export const toVectorLiteral = (vector: number[]) => `[${vector.join(",")}]`;

export async function ensureSchema(): Promise<void> {
  const db = sql();
  for (const statement of SCHEMA_STATEMENTS) await db.query(statement);
}

/** Hash guardado por clave, solo para el modelo dado (los de otro modelo se consideran pendientes). */
export async function storedHashes(model: string): Promise<Map<string, string>> {
  const rows = (await sql().query("SELECT key, hash FROM knowledge_embeddings WHERE model = $1", [model])) as { key: string; hash: string }[];
  return new Map(rows.map((r) => [r.key, r.hash]));
}

export async function upsertVectors(rows: VectorRow[], model: string): Promise<void> {
  if (rows.length === 0) return;
  const db = sql();
  await db.transaction(
    rows.map((row) =>
      db.query(
        `INSERT INTO knowledge_embeddings (key, kind, hash, model, embedding, updated_at)
         VALUES ($1, $2, $3, $4, $5::vector, now())
         ON CONFLICT (key) DO UPDATE SET kind = EXCLUDED.kind, hash = EXCLUDED.hash, model = EXCLUDED.model,
           embedding = EXCLUDED.embedding, updated_at = now()`,
        [row.key, row.kind, row.hash, model, toVectorLiteral(row.vector)],
      ),
    ),
  );
}

/** Borra los vectores de documentos que ya no están en el bundle. Devuelve cuántos borró. */
export async function deleteVectorsExcept(keys: string[]): Promise<number> {
  const rows = (await sql().query("DELETE FROM knowledge_embeddings WHERE NOT (key = ANY($1::text[])) RETURNING key", [keys])) as unknown[];
  return rows.length;
}

/**
 * Vecinos más cercanos por similitud coseno: textos (índice HNSW) y conceptos (pocos: recorrido completo).
 * Devuelve null si la base no está configurada o falla, para que la búsqueda siga sin la señal semántica.
 */
export async function nearestNeighbors(
  vector: number[],
  model: string,
  limits: { articles: number; concepts: number } = { articles: 40, concepts: 5 },
): Promise<{ articles: Neighbor[]; concepts: Neighbor[] } | null> {
  if (!vectorStoreConfigured()) return null;
  try {
    const db = sql();
    const literal = toVectorLiteral(vector);
    const [, articles, concepts] = (await db.transaction([
      // El índice HNSW devuelve como mucho ef_search candidatos: se sube para cubrir el LIMIT.
      db.query(`SET LOCAL hnsw.ef_search = ${Math.max(40, limits.articles * 2)}`),
      db.query(
        `SELECT key, 1 - (embedding <=> $1::vector) AS similarity FROM knowledge_embeddings
         WHERE kind = 'article' AND model = $2 ORDER BY embedding <=> $1::vector LIMIT $3`,
        [literal, model, limits.articles],
      ),
      db.query(
        `SELECT key, 1 - (embedding <=> $1::vector) AS similarity FROM knowledge_embeddings
         WHERE kind = 'concept' AND model = $2 ORDER BY similarity DESC LIMIT $3`,
        [literal, model, limits.concepts],
      ),
    ])) as [unknown, { key: string; similarity: number | string }[], { key: string; similarity: number | string }[]];
    const parse = (rows: { key: string; similarity: number | string }[]) => rows.map((r) => ({ key: r.key, similarity: Number(r.similarity) }));
    return { articles: parse(articles), concepts: parse(concepts) };
  } catch (error) {
    logger.warn("Vector search failed; continuing without semantic search", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
