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

  it("marks AI-generated content as unverified drafts", () => {
    expect(result.bundle.articles.every((a) => a.trust === "unverified" && a.status === "draft")).toBe(true);
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

describe("trustTier (OKF §5.3)", () => {
  it("derives the tier from verified", () => {
    expect(trustTier(undefined)).toBe("unverified");
    expect(trustTier({ by: "process:nightly", at: "2026-01-01T00:00:00Z" })).toBe("machine-confirmed");
    expect(trustTier([{ by: "process:nightly" }, { by: "human:jpviola" }])).toBe("human-reviewed");
  });
});
