/**
 * Sube a GraphDB el grafo generado desde el bundle OKF (scripts/generated/knowledge.ttl).
 * Uso: GRAPHDB_ENDPOINT_URL=http://localhost:7200/repositories/santoTomas npm run knowledge:graphdb
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const endpoint = process.env.GRAPHDB_ENDPOINT_URL;
  if (!endpoint) {
    console.error("Definí GRAPHDB_ENDPOINT_URL (p. ej. http://localhost:7200/repositories/santoTomas).");
    process.exit(1);
  }
  const ttl = readFileSync(join(__dirname, "..", "generated", "knowledge.ttl"), "utf8");
  const response = await fetch(`${endpoint}/statements`, {
    method: "POST",
    headers: { "Content-Type": "application/x-turtle" },
    body: ttl,
  });
  if (response.status !== 204) {
    console.error(`GraphDB respondió ${response.status}: ${await response.text()}`);
    process.exit(1);
  }
  console.log("Grafo de conocimiento cargado en GraphDB.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
