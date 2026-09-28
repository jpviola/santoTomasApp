-- Vectores de la base de conocimiento (búsqueda semántica).
-- Lo aplica `npm run knowledge:embed` si falta; también se puede correr a mano.
-- 1024 dimensiones: qwen3-embedding-0-6b (Neon AI Gateway) y text-embedding-3-small con dimensions=1024.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  key        text PRIMARY KEY,                                   -- "article:<id>" o "concept:<id>"
  kind       text NOT NULL CHECK (kind IN ('article', 'concept')),
  hash       text NOT NULL,                                      -- hash del texto embebido: detecta cambios
  model      text NOT NULL,
  embedding  vector(1024) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_hnsw
  ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);
