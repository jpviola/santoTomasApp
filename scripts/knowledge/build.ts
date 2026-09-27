/**
 * Compila el bundle OKF de knowledge/:
 *   - valida conformidad OKF v0.2 y la integridad de la ontología,
 *   - regenera las secciones derivadas de cada .md y los index.md,
 *   - escribe src/data/knowledge/bundle.json (lo que consume la app)
 *     y scripts/generated/knowledge.ttl (para GraphDB).
 *
 * Uso: npm run knowledge:build          (escribe)
 *      npm run knowledge:check          (no escribe; falla si algo está desactualizado)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { compileKnowledge, embeddingInputs, type SourceFile } from "../../src/lib/knowledge/compile";
import type { EmbeddingIndex } from "../../src/lib/knowledge/types";

const ROOT = join(__dirname, "..", "..");
const BUNDLE_DIR = join(ROOT, "knowledge");
const BUNDLE_JSON = join(ROOT, "src", "data", "knowledge", "bundle.json");
const EMBEDDINGS_JSON = join(ROOT, "src", "data", "knowledge", "embeddings.json");
const TTL = join(ROOT, "scripts", "generated", "knowledge.ttl");

const checkOnly = process.argv.includes("--check");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : name.endsWith(".md") ? [full] : [];
  });
}

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : null);

const files: SourceFile[] = walk(BUNDLE_DIR).map((full) => ({
  path: relative(BUNDLE_DIR, full).replace(/\\/g, "/"),
  content: readFileSync(full, "utf8"),
}));

const result = compileKnowledge(files);

for (const warning of result.warnings) console.warn(`aviso: ${warning}`);
if (result.errors.length > 0) {
  for (const error of result.errors) console.error(`error: ${error}`);
  console.error(`\n${result.errors.length} error(es). El bundle no se compiló.`);
  process.exit(1);
}

const targets: { path: string; content: string }[] = [
  ...result.outputs.map((o) => ({ path: join(BUNDLE_DIR, o.path), content: o.content })),
  { path: BUNDLE_JSON, content: `${JSON.stringify(result.bundle, null, 2)}\n` },
  { path: TTL, content: result.ttl },
];
if (!existsSync(EMBEDDINGS_JSON)) {
  const empty: EmbeddingIndex = { model: null, dimensions: 0, items: {} };
  targets.push({ path: EMBEDDINGS_JSON, content: `${JSON.stringify(empty)}\n` });
}

const stale = targets.filter((t) => read(t.path) !== t.content);

// Embeddings desactualizados: no rompen el build (la búsqueda semántica los ignora), pero se avisa.
const embeddings = JSON.parse(read(EMBEDDINGS_JSON) ?? '{"model":null,"items":{}}') as EmbeddingIndex;
if (embeddings.model) {
  const outdated = embeddingInputs(result.bundle).filter((i) => embeddings.items[i.key]?.hash !== i.hash);
  if (outdated.length) console.warn(`aviso: ${outdated.length} embeddings desactualizados; corré npm run knowledge:embed`);
}

const { articles, concepts, areas, authors, works } = result.bundle;
const summary = `${articles.length} textos, ${concepts.length} conceptos, ${areas.length} áreas, ${authors.length} autores, ${works.length} obras`;

if (checkOnly) {
  if (stale.length) {
    for (const t of stale) console.error(`desactualizado: ${relative(ROOT, t.path)}`);
    console.error("\nCorré npm run knowledge:build y commiteá el resultado.");
    process.exit(1);
  }
  console.log(`Bundle OKF al día (${summary}).`);
} else {
  for (const t of stale) {
    mkdirSync(dirname(t.path), { recursive: true });
    writeFileSync(t.path, t.content, "utf8");
    console.log(`escrito: ${relative(ROOT, t.path)}`);
  }
  console.log(`Bundle OKF compilado (${summary}).`);
}
