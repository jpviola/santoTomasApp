/**
 * Genera o actualiza los embeddings del bundle en Postgres + pgvector (tabla knowledge_embeddings).
 * Incremental: solo embebe los documentos cuyo texto cambió (hash) o que no tienen vector para el modelo actual,
 * y borra los vectores de documentos que ya no existen.
 *
 * Requiere KNOWLEDGE_DATABASE_URL y un proveedor (ver src/lib/llm/embeddings.ts):
 *   EMBEDDING_API_KEY [+ EMBEDDING_BASE_URL, EMBEDDING_MODEL]   o   NEON_AI_GATEWAY_TOKEN + NEON_AI_GATEWAY_BASE_URL
 *
 * Uso: npm run knowledge:embed                 (lee .env.local)
 *      npm run knowledge:embed -- --dry-run    (cuenta lo pendiente y estima tokens, sin llamar a la API)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { embeddingInputs } from "../../src/lib/knowledge/compile";
import type { KnowledgeBundle } from "../../src/lib/knowledge/types";
import { deleteVectorsExcept, ensureSchema, storedHashes, upsertVectors, vectorStoreConfigured, type VectorKind } from "../../src/lib/knowledge/vectorStore";
import { embedTexts, embeddingConfig } from "../../src/lib/llm/embeddings";

const ROOT = join(__dirname, "..", "..");
const BATCH = 64;
const dryRun = process.argv.includes("--dry-run");

// Carga .env.local sin dependencias (solo claves que no estén ya en el entorno).
const envFile = join(ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const bundle = JSON.parse(readFileSync(join(ROOT, "src", "data", "knowledge", "bundle.json"), "utf8")) as KnowledgeBundle;
  const inputs = embeddingInputs(bundle);
  const config = embeddingConfig();
  const model = config?.model ?? process.env.EMBEDDING_MODEL ?? "(sin proveedor)";

  if (!vectorStoreConfigured()) {
    console.error("Falta KNOWLEDGE_DATABASE_URL (en .env.local o en el entorno).");
    process.exit(1);
  }
  await ensureSchema();
  const stored = await storedHashes(model);
  const pending = inputs.filter((i) => stored.get(i.key) !== i.hash);
  const estimatedTokens = Math.round(pending.reduce((sum, i) => sum + i.text.length, 0) / 4);

  console.log(`${inputs.length} documentos; ${pending.length} pendientes para ${model} (~${estimatedTokens.toLocaleString("es")} tokens).`);
  if (dryRun) return;
  if (!config) {
    console.error("Falta un proveedor de embeddings: EMBEDDING_API_KEY o NEON_AI_GATEWAY_TOKEN + NEON_AI_GATEWAY_BASE_URL.");
    process.exit(1);
  }

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const vectors = await embedTexts(batch.map((b) => b.text), config);
    await upsertVectors(
      batch.map((b, j) => ({ key: b.key, kind: b.key.split(":")[0] as VectorKind, hash: b.hash, vector: vectors[j] })),
      config.model,
    );
    console.log(`  ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  }

  const removed = await deleteVectorsExcept(inputs.map((i) => i.key));
  console.log(`Listo: ${pending.length} embebidos con ${config.model}${removed ? `, ${removed} vectores obsoletos borrados` : ""}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
