/**
 * Importa la Summa Theologiae al bundle OKF desde New Advent (traducción de los dominicos, 1920, dominio público):
 *   - knowledge/cuestiones/st-<parte>-q<n>.md  (type: Summa Question)
 *   - knowledge/articulos/st-<parte>-q<n>-a<m>.md  (type: Aquinas Text, content: excerpt = fragmento textual del respondeo)
 * Etiqueta con conceptos usando scripts/knowledge/summa-treatises.json y las etiquetas de los conceptos que aparecen en los títulos.
 * Nunca pisa documentos que no haya generado él mismo (p. ej. los textos curados con resumen).
 *
 * Uso: npm run knowledge:import -- [--parts I,I-II] [--limit 10] [--delay 1000]
 * Luego: npm run knowledge:build
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { splitFrontmatter } from "../../src/lib/knowledge/compile";
import { findPhrase, normalizeText } from "../../src/lib/knowledge/lexical";
import type { KnowledgeBundle } from "../../src/lib/knowledge/types";
import { buildQuestionUrl, extractSummaArticle, htmlToPlainText, stSourceId, type StPart } from "../../src/lib/retrieval/summaText";

const ROOT = join(__dirname, "..", "..");
const BUNDLE_DIR = join(ROOT, "knowledge");
const CACHE_DIR = join(ROOT, ".cache", "newadvent");
const ACTOR = "process:import-newadvent";
const EXCERPT_CHARS = 1000;
// Etiquetar por título solo con etiquetas específicas: las genéricas ("truth", "law", "soul") y las ambiguas
// ("passion": también la Pasión de Cristo) meten ruido; esos temas los cubre el mapa de tratados.
const NO_TITLE_TAGGING = new Set(["dios"]);
const AMBIGUOUS_LABELS = new Set(["passion", "passio", "passions"]);
const specificLabel = (label: string) => !AMBIGUOUS_LABELS.has(label) && (label.includes(" ") || label.length >= 6);

type Treatise = { part: StPart; from: number; to: number; treatise?: string; concepts: string[] };
const map = JSON.parse(readFileSync(join(__dirname, "summa-treatises.json"), "utf8")) as {
  parts: Record<StPart, number>;
  treatises: Treatise[];
};
const bundle = JSON.parse(readFileSync(join(ROOT, "src", "data", "knowledge", "bundle.json"), "utf8")) as KnowledgeBundle;

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const parts = (arg("parts")?.split(",") ?? Object.keys(map.parts)) as StPart[];
const limit = Number(arg("limit")) || Infinity;
const delayMs = Number(arg("delay") ?? 1000);
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const q = (value: string) => JSON.stringify(value);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchQuestion(part: StPart, question: number): Promise<string> {
  const url = buildQuestionUrl({ part, question, article: 1 }, "en");
  const cachePath = join(CACHE_DIR, url.split("/").pop()!);
  if (existsSync(cachePath)) return readFileSync(cachePath, "utf8");
  await sleep(delayMs);
  const response = await fetch(url, { headers: { "User-Agent": "StoTomasApp/1.0 (+https://github.com/jpviola/santoTomasApp)" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  const html = await response.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, html, "utf8");
  return html;
}

/** Se puede escribir si no existe o si lo generó este importador. */
function writable(path: string): boolean {
  if (!existsSync(path)) return true;
  const { frontmatter } = splitFrontmatter(readFileSync(path, "utf8"));
  const generated = frontmatter?.generated as { by?: string } | undefined;
  return generated?.by === ACTOR;
}

const labelIndex = bundle.concepts
  .filter((c) => !NO_TITLE_TAGGING.has(c.id))
  .map((c) => ({ id: c.id, labels: [...c.labels.en, ...c.labels.la].filter(specificLabel) }));

function conceptsInTitle(title: string): string[] {
  const normalized = normalizeText(title);
  return labelIndex.filter((c) => c.labels.some((label) => findPhrase(normalized, label) >= 0)).map((c) => c.id);
}

function treatiseFor(part: StPart, question: number) {
  const ranges = map.treatises.filter((t) => t.part === part && question >= t.from && question <= t.to);
  return {
    treatise: ranges.find((t) => t.treatise)?.treatise ?? "",
    concepts: [...new Set(ranges.flatMap((t) => t.concepts))],
  };
}

const firstSentence = (text: string) => {
  const cleaned = text.replace(/^I answer that,?\s*/i, "");
  const sentence = cleaned.split(/(?<=[.;?])\s/)[0] ?? cleaned;
  return sentence.length <= 200 ? sentence : `${sentence.slice(0, 197).replace(/\s+\S*$/, "")}…`;
};

const partLabel: Record<StPart, string> = { I: "Prima pars", "I-II": "Prima secundae", "II-II": "Secunda secundae", III: "Tertia pars" };

async function main() {
  let questionsDone = 0;
  let articlesWritten = 0;
  let skipped = 0;
  for (const part of parts) {
    for (let question = 1; question <= map.parts[part] && questionsDone < limit; question += 1) {
      const html = await fetchQuestion(part, question);
      const qTitle = htmlToPlainText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/^Question \d+\.\s*/, "");
      const articleTitles = [...html.matchAll(/<h2 id="article(\d+)">([\s\S]*?)<\/h2>/g)].map((m) => ({
        n: Number(m[1]),
        title: htmlToPlainText(m[2]).replace(/^Article \d+\.\s*/, "").replace(/\?$/, ""),
      }));
      const { treatise, concepts } = treatiseFor(part, question);
      // Los conceptos de la cuestión (centrales) salen solo del mapa de tratados; lo que nombra el título
      // de la cuestión o del artículo se suma a cada artículo como etiqueta incidental.
      const questionConcepts = concepts;
      const questionTitleConcepts = conceptsInTitle(qTitle);
      const questionId = `st-${part.toLowerCase()}-q${question}`;
      const citation = `ST ${part}, q.${question}`;
      const enUrl = buildQuestionUrl({ part, question, article: 1 }, "en");
      const laUrl = buildQuestionUrl({ part, question, article: 1 }, "la");
      const sources = `sources:
  - { id: newadvent, resource: ${q(enUrl)}, title: "Summa Theologiae, trad. inglesa de los dominicos (1920), dominio público" }
  - { id: corpus-thomisticum, resource: ${q(laUrl)}, title: "Texto latino, Corpus Thomisticum" }`;

      const questionPath = join(BUNDLE_DIR, "cuestiones", `${questionId}.md`);
      if (writable(questionPath)) {
        mkdirSync(join(BUNDLE_DIR, "cuestiones"), { recursive: true });
        writeFileSync(
          questionPath,
          `---
type: Summa Question
title: ${q(qTitle)}
description: ${q(`${citation} · ${partLabel[part]}${treatise ? ` · ${treatise}` : ""} · ${articleTitles.length} artículos`)}
resource: ${q(enUrl)}
citation: ${q(citation)}
treatise: ${q(treatise)}
tags: [${questionConcepts.map(q).join(", ")}]
status: stable
generated: { by: ${q(ACTOR)}, at: ${q(now)} }
${sources}
---

${citation}: ${qTitle}.[^newadvent]

[^newadvent]: Summa Theologiae, trad. inglesa de los dominicos (1920)

<!-- okf:generated:start -->
<!-- okf:generated:end -->
`,
          "utf8",
        );
      }

      for (const { n, title } of articleTitles) {
        const id = stSourceId({ part, question, article: n });
        const path = join(BUNDLE_DIR, "articulos", `${id}.md`);
        if (!writable(path)) {
          skipped += 1;
          continue;
        }
        const excerpt = extractSummaArticle(html, n, "en", EXCERPT_CHARS);
        if (!excerpt) {
          console.warn(`sin respondeo: ${citation}, a.${n}`);
          continue;
        }
        const tags = [...new Set([...questionConcepts, ...questionTitleConcepts, ...conceptsInTitle(title)])];
        writeFileSync(
          path,
          `---
type: Aquinas Text
title: ${q(title)}
description: ${q(firstSentence(excerpt.text))}
resource: ${q(`${enUrl}#article${n}`)}
citation: ${q(`${citation}, a.${n}`)}
work: summa-theologiae
content: excerpt
tags: [${tags.map(q).join(", ")}]
keywords: []
status: stable
generated: { by: ${q(ACTOR)}, at: ${q(now)} }
${sources.replace(q(enUrl), q(`${enUrl}#article${n}`))}
---

# Respondeo (excerpt)

${excerpt.text}[^newadvent]

[^newadvent]: Summa Theologiae, trad. inglesa de los dominicos (1920)

<!-- okf:generated:start -->
<!-- okf:generated:end -->
`,
          "utf8",
        );
        articlesWritten += 1;
      }
      questionsDone += 1;
      if (questionsDone % 20 === 0) console.log(`  ${part} q.${question} (${questionsDone} cuestiones, ${articlesWritten} artículos)`);
    }
  }
  console.log(`Listo: ${questionsDone} cuestiones, ${articlesWritten} artículos escritos, ${skipped} textos curados conservados.`);
  console.log("Siguiente paso: npm run knowledge:build");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
