/**
 * Genera o actualiza los embeddings del bundle en Postgres + pgvector (tabla knowledge_embeddings).
 * Incremental: solo embebe los documentos cuyo texto cambió (hash) o que no tienen vector para el modelo actual,
 * y borra los vectores de documentos que ya no existen.
 *
 * Requiere KNOWLEDGE_DATABASE_URL y un proveedor (ver src/lib/llm/embeddings.ts), p. ej. GEMINI_API_KEY o JINA_API_KEY.
 *
 * Uso: npm run knowledge:embed                          (lee .env.local)
 *      npm run knowledge:embed -- --dry-run             (cuenta lo pendiente y estima tokens, sin llamar a la API)
 *      npm run knowledge:embed -- --batch 32 --pause 2000   (lotes más chicos y espera entre lotes, para planes gratuitos)
 * Cada lote se guarda apenas llega: si un límite de uso corta la corrida, volver a correrlo retoma donde quedó.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { embeddingInputs } from "../../src/lib/knowledge/compile";
import type { KnowledgeBundle } from "../../src/lib/knowledge/types";
import { deleteVectorsExcept, ensureSchema, storedHashes, upsertVectors, vectorStoreConfigured, type VectorKind } from "../../src/lib/knowledge/vectorStore";
import { embedTexts, embeddingConfig } from "../../src/lib/llm/embeddings";

const ROOT = join(__dirname, "..", "..");
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : undefined;
};
const dryRun = process.argv.includes("--dry-run");
const pauseMs = arg("pause") ?? 0;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    console.error("Falta un proveedor de embeddings: GEMINI_API_KEY, JINA_API_KEY, EMBEDDING_API_KEY o NEON_AI_GATEWAY_TOKEN (ver .env.example).");
    process.exit(1);
  }

  // Gemini acepta hasta 100 textos por pedido; 64 es un buen tamaño para todos.
  const batchSize = Math.min(arg("batch") ?? 64, 100);
  console.log(`Proveedor: ${config.provider} · modelo ${config.model} · lotes de ${batchSize}`);
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    try {
      const vectors = await embedTexts(batch.map((b) => b.text), config, "document");
      await upsertVectors(
        batch.map((b, j) => ({ key: b.key, kind: b.key.split(":")[0] as VectorKind, hash: b.hash, vector: vectors[j] })),
        config.model,
      );
    } catch (error) {
      console.error(`\nSe cortó en ${i}/${pending.length}: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Lo embebido hasta acá quedó guardado. Si es un límite de uso, esperá y volvé a correr el comando: retoma donde quedó.");
      process.exit(1);
    }
    console.log(`  ${Math.min(i + batchSize, pending.length)}/${pending.length}`);
    if (pauseMs && i + batchSize < pending.length) await sleep(pauseMs);
  }

  const removed = await deleteVectorsExcept(inputs.map((i) => i.key));
  console.log(`Listo: ${pending.length} embebidos con ${config.model}${removed ? `, ${removed} vectores obsoletos borrados` : ""}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
