/**
 * Genera o actualiza src/data/knowledge/embeddings.json para la búsqueda semántica.
 * Incremental: solo re-embebe los documentos cuyo texto cambió (hash) o todos si cambia el modelo.
 *
 * Uso: EMBEDDING_API_KEY=... npm run knowledge:embed
 * Opcionales: EMBEDDING_BASE_URL (default https://api.openai.com/v1),
 *             EMBEDDING_MODEL (default text-embedding-3-small), EMBEDDING_DIMENSIONS (default 512).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { embeddingInputs } from "../../src/lib/knowledge/compile";
import type { EmbeddingIndex, KnowledgeBundle } from "../../src/lib/knowledge/types";
import { DEFAULT_EMBEDDING_DIMENSIONS, DEFAULT_EMBEDDING_MODEL, embedTexts, embeddingsConfigured } from "../../src/lib/llm/embeddings";

const ROOT = join(__dirname, "..", "..");
const BUNDLE_JSON = join(ROOT, "src", "data", "knowledge", "bundle.json");
const EMBEDDINGS_JSON = join(ROOT, "src", "data", "knowledge", "embeddings.json");
const BATCH = 64;

async function main() {
  if (!embeddingsConfigured()) {
    console.error("Definí EMBEDDING_API_KEY (y EMBEDDING_BASE_URL si no usás la API de OpenAI).");
    process.exit(1);
  }
  const bundle = JSON.parse(readFileSync(BUNDLE_JSON, "utf8")) as KnowledgeBundle;
  const current = JSON.parse(readFileSync(EMBEDDINGS_JSON, "utf8")) as EmbeddingIndex;

  const model = process.env.EMBEDDING_MODEL || current.model || DEFAULT_EMBEDDING_MODEL;
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS) || (current.model === model ? current.dimensions : 0) || DEFAULT_EMBEDDING_DIMENSIONS;
  const sameSpace = current.model === model && current.dimensions === dimensions;

  const inputs = embeddingInputs(bundle);
  const pending = inputs.filter((i) => !sameSpace || current.items[i.key]?.hash !== i.hash);
  const items: EmbeddingIndex["items"] = {};
  for (const input of inputs) {
    if (sameSpace && current.items[input.key]?.hash === input.hash) items[input.key] = current.items[input.key];
  }

  console.log(`${pending.length} de ${inputs.length} documentos para embeber con ${model} (${dimensions} dims).`);
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const vectors = await embedTexts(batch.map((b) => b.text), model, dimensions);
    batch.forEach((b, j) => {
      items[b.key] = { hash: b.hash, vector: vectors[j].map((x) => Math.round(x * 1e6) / 1e6) };
    });
    console.log(`  ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  }

  const index: EmbeddingIndex = { model, dimensions, items };
  writeFileSync(EMBEDDINGS_JSON, `${JSON.stringify(index)}\n`, "utf8");
  console.log(`Índice escrito: ${Object.keys(items).length} vectores.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
