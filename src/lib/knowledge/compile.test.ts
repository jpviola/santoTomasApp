import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { compileKnowledge, GENERATED_END, GENERATED_START, splitFrontmatter, trustTier, type SourceFile } from "@/lib/knowledge/compile";

const BUNDLE_DIR = join(__dirname, "..", "..", "..", "knowledge");

function readBundle(): SourceFile[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : name.endsWith(".md") ? [full] : [];
    });
  return walk(BUNDLE_DIR).map((full) => ({ path: relative(BUNDLE_DIR, full).replace(/\\/g, "/"), content: readFileSync(full, "utf8") }));
}

const concept = (id: string, fm: string, body = "Definición.") => ({
  path: `conceptos/${id}.md`,
  content: `---\ntype: Concept\ntitle: ${id}\ndescription: d\narea: a\nlabels: { es: ["${id}"], en: [], la: [] }\n${fm}\n---\n\n${body}\n`,
});
const area = { path: "areas/a.md", content: "---\ntype: Area\ntitle: A\n---\n\nÁrea.\n" };
const work = { path: "obras/summa-theologiae.md", content: "---\ntype: Work\ntitle: ST\n---\n\nObra.\n" };
const article = (id: string, citation: string, tags: string[]) => ({
  path: `articulos/${id}.md`,
  content: `---\ntype: Aquinas Text\ntitle: T\ncitation: "${citation}"\nwork: summa-theologiae\ntags: ${JSON.stringify(tags)}\nkeywords: ["k"]\n---\n\n# Summary\n\nResumen.[^s]\n\n[^s]: Fuente\n`,
});

describe("the knowledge/ bundle", () => {
  const result = compileKnowledge(readBundle());

  it("is OKF-conformant and has no ontology errors", () => {
    expect(result.errors).toEqual([]);
    expect(result.bundle.articles.length).toBeGreaterThanOrEqual(88);
    expect(result.bundle.concepts.length).toBeGreaterThanOrEqual(60);
  });

  it("is in sync with the committed generated files (run npm run knowledge:build)", () => {
    expect(result.outputs.map((o) => o.path)).toEqual([]);
    const committed = readFileSync(join(__dirname, "..", "..", "data", "knowledge", "bundle.json"), "utf8").replace(/\r\n/g, "\n");
    expect(committed).toBe(`${JSON.stringify(result.bundle, null, 2)}\n`);
  });

  it("marks AI-written summaries as unverified drafts", () => {
    const summaries = result.bundle.articles.filter((a) => a.textKind === "summary");
    expect(summaries.length).toBeGreaterThanOrEqual(88);
    expect(summaries.every((a) => a.trust === "unverified" && a.status === "draft")).toBe(true);
  });

  it("links every imported Summa text to its question", () => {
    const excerpts = result.bundle.articles.filter((a) => a.textKind === "excerpt");
    expect(excerpts.every((a) => a.question)).toBe(true);
  });
});

describe("compileKnowledge", () => {
  it("rejects documents without frontmatter or without type (OKF §11)", () => {
    const { errors } = compileKnowledge([
      { path: "conceptos/x.md", content: "sin frontmatter" },
      { path: "conceptos/y.md", content: "---\ntitle: Y\n---\n\nCuerpo" },
    ]);
    expect(errors).toHaveLength(2);
  });

  it("ignores the reserved index.md and log.md files", () => {
    const { errors } = compileKnowledge([{ path: "index.md", content: "# Índice" }, { path: "conceptos/log.md", content: "# Log" }]);
    expect(errors).toEqual([]);
  });

  it("reports unknown relations and cycles in the broader hierarchy", () => {
    const { errors } = compileKnowledge([
      area,
      concept("a1", "broader: [a2]\nrelated: [nope]"),
      concept("a2", "broader: [a1]\nrelated: []"),
    ]);
    expect(errors.some((e) => e.includes('"nope"'))).toBe(true);
    expect(errors.some((e) => e.includes("ciclo"))).toBe(true);
  });

  it("derives narrower and symmetric related, and links concepts to their texts", () => {
    const { bundle, errors } = compileKnowledge([
      area,
      work,
      concept("ley", "broader: []\nrelated: []"),
      concept("ley-natural", "broader: [ley]\nrelated: [sinderesis]"),
      concept("sinderesis", "broader: []\nrelated: []"),
      article("st-i-ii-q94-a2", "ST I-II, q.94, a.2", ["ley-natural"]),
    ]);
    expect(errors).toEqual([]);
    const byId = new Map(bundle.concepts.map((c) => [c.id, c]));
    expect(byId.get("ley")?.narrower).toEqual(["ley-natural"]);
    expect(byId.get("sinderesis")?.related).toEqual(["ley-natural"]);
    expect(byId.get("ley-natural")?.articles).toEqual(["st-i-ii-q94-a2"]);
    expect(bundle.articles[0].text).toBe("Resumen.");
  });

  it("rejects a Summa text whose citation does not match its file name", () => {
    const { errors } = compileKnowledge([area, work, concept("c", "broader: []\nrelated: []"), article("st-i-q2-a3", "ST I, q.2, a.2", ["c"])]);
    expect(errors.some((e) => e.includes("no corresponde"))).toBe(true);
  });

  it("writes generated sections between markers and is idempotent", () => {
    const files = [area, work, concept("ley", "broader: []\nrelated: []"), concept("ley-natural", "broader: [ley]\nrelated: []")];
    const first = compileKnowledge(files);
    const updated = first.outputs.find((o) => o.path === "conceptos/ley.md")!;
    expect(updated.content).toContain(GENERATED_START);
    expect(updated.content).toContain("[ley-natural](/conceptos/ley-natural.md)");
    expect(updated.content).toContain(GENERATED_END);

    const rewritten = files.map((f) => first.outputs.find((o) => o.path === f.path) ?? f);
    const indexFiles = first.outputs.filter((o) => o.path.endsWith("index.md"));
    const second = compileKnowledge([...rewritten, ...indexFiles]);
    expect(second.outputs).toEqual([]);
  });

  it("declares okf_version in the root index and exports RDF for GraphDB", () => {
    const { outputs, ttl } = compileKnowledge([area, concept("ley", "broader: []\nrelated: []")]);
    const root = outputs.find((o) => o.path === "index.md")!;
    expect(splitFrontmatter(root.content).frontmatter).toEqual({ okf_version: "0.2" });
    expect(ttl).toContain("<https://stotomas.ai/ontology/ley> a <http://schema.org/DefinedTerm>");
  });
});

describe("Summa questions", () => {
  const question = {
    path: "cuestiones/st-i-ii-q94.md",
    content: `---
type: Summa Question
title: The natural law
citation: "ST I-II, q.94"
treatise: "La ley"
tags: ["ley-natural"]
---

Cuestión.
`,
  };
  const leyNatural = concept("ley-natural", ["broader: []", "related: []"].join("\n"));
  const excerpt = (id: string, title: string, extra = "") => ({
    path: `articulos/${id}.md`,
    content: `---
type: Aquinas Text
title: ${title}
citation: "ST I-II, q.94, a.${id.split("-a")[1]}"
work: summa-theologiae
content: excerpt
tags: ["ley-natural"]${extra}
---

I answer that, a thing may be called a habit in two ways.
`,
  });

  it("attaches texts to their question and lists them in the question and the concept", () => {
    const { bundle, errors, outputs } = compileKnowledge([area, work, leyNatural, question, excerpt("st-i-ii-q94-a1", "Whether the natural law is a habit")]);
    expect(errors).toEqual([]);
    expect(bundle.articles[0]).toMatchObject({ textKind: "excerpt", question: "st-i-ii-q94", coreConcepts: ["ley-natural"] });
    expect(bundle.questions[0].articles).toEqual(["st-i-ii-q94-a1"]);
    expect(bundle.concepts[0].questions).toEqual(["st-i-ii-q94"]);
    const conceptPage = outputs.find((o) => o.path === "conceptos/ley-natural.md")!.content;
    expect(conceptPage).toContain("# Cuestiones de la Summa");
    expect(conceptPage).not.toContain("# Dónde lo trata Tomás");
  });

  it("orders a concept's texts: those whose title names it come first", () => {
    const withEnglishLabel = {
      path: leyNatural.path,
      content: leyNatural.content.replace('en: []', 'en: ["natural law"]'),
    };
    const { bundle } = compileKnowledge([
      area, work, withEnglishLabel, question,
      excerpt("st-i-ii-q94-a1", "Whether it is a habit"),
      excerpt("st-i-ii-q94-a2", "Whether the natural law contains several precepts"),
    ]);
    expect(bundle.concepts[0].articles).toEqual(["st-i-ii-q94-a2", "st-i-ii-q94-a1"]);
  });

  it("rejects an unknown content kind and a question whose citation does not match", () => {
    const wrong = { ...question, path: "cuestiones/st-i-ii-q95.md" };
    const bad = excerpt("st-i-ii-q94-a3", "Whether x").content.replace("content: excerpt", "content: poem");
    const { errors } = compileKnowledge([area, work, leyNatural, wrong, { path: "articulos/st-i-ii-q94-a3.md", content: bad }]);
    expect(errors.some((e) => e.includes("cuestiones/st-i-ii-q95.md"))).toBe(true);
    expect(errors.some((e) => e.includes("\"content\""))).toBe(true);
  });
});

describe("trustTier (OKF §5.3)", () => {
  it("derives the tier from verified", () => {
    expect(trustTier(undefined)).toBe("unverified");
    expect(trustTier({ by: "process:nightly", at: "2026-01-01T00:00:00Z" })).toBe("machine-confirmed");
    expect(trustTier([{ by: "process:nightly" }, { by: "human:jpviola" }])).toBe("human-reviewed");
  });
});
