import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { parseStCitation, stSourceId } from "@/lib/retrieval/summaText";
import type {
  KnowledgeArea,
  KnowledgeArticle,
  KnowledgeAuthor,
  KnowledgeBundle,
  KnowledgeConcept,
  KnowledgeWork,
  Lifecycle,
  TrustTier,
} from "@/lib/knowledge/types";

/**
 * Compilador del bundle OKF v0.2 de `knowledge/`.
 * Entrada: los archivos .md (ruta relativa al bundle + contenido).
 * Salida: errores, advertencias, archivos .md/index.md a reescribir, el JSON de la app y un TTL para GraphDB.
 * Es puro (sin E/S) para poder testearlo; scripts/knowledge/build.ts hace la lectura y escritura.
 */

export const OKF_VERSION = "0.2";
export const GENERATED_START = "<!-- okf:generated:start -->";
export const GENERATED_END = "<!-- okf:generated:end -->";

export type SourceFile = { path: string; content: string };

export type CompileResult = {
  errors: string[];
  warnings: string[];
  /** Archivos cuyo contenido debe quedar así (solo los que cambian respecto de la entrada, más los index.md). */
  outputs: SourceFile[];
  bundle: KnowledgeBundle;
  ttl: string;
};

type Frontmatter = Record<string, unknown>;
type ParsedDoc = { path: string; dir: string; id: string; frontmatter: Frontmatter; body: string; authored: string };

const DIRS = { concepts: "conceptos", articles: "articulos", areas: "areas", authors: "autores", works: "obras" } as const;

export function splitFrontmatter(content: string): { frontmatter: Frontmatter | null; body: string } {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: normalized };
  const parsed = parseYaml(match[1]) as unknown;
  return {
    frontmatter: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Frontmatter) : null,
    body: match[2],
  };
}

/** Cuerpo escrito a mano: todo lo anterior al bloque generado. */
function authoredPart(body: string): string {
  const start = body.indexOf(GENERATED_START);
  return (start >= 0 ? body.slice(0, start) : body).trim();
}

function withGeneratedBlock(content: string, generated: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  const block = `${GENERATED_START}\n${generated.trim() ? `${generated.trim()}\n` : ""}${GENERATED_END}`;
  const start = normalized.indexOf(GENERATED_START);
  const end = normalized.indexOf(GENERATED_END);
  if (start >= 0 && end > start) {
    return `${normalized.slice(0, start)}${block}${normalized.slice(end + GENERATED_END.length)}`;
  }
  return `${normalized.trimEnd()}\n\n${block}\n`;
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const strList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

export function trustTier(verified: unknown): TrustTier {
  const entries = Array.isArray(verified) ? verified : verified && typeof verified === "object" ? [verified] : [];
  const actors = entries.map((e) => str((e as { by?: unknown }).by)).filter(Boolean);
  if (actors.length === 0) return "unverified";
  return actors.some((a) => a.startsWith("human:")) ? "human-reviewed" : "machine-confirmed";
}

const lifecycle = (value: unknown): Lifecycle => (value === "draft" || value === "deprecated" ? value : "stable");

/** Texto plano del resumen: sin encabezados, notas al pie ni sus referencias. */
function plainSummary(authored: string): string {
  return authored
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line) && !/^\[\^[^\]]+\]:/.test(line))
    .join("\n")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Texto sin sintaxis de enlaces markdown, para prompts y embeddings. */
export function stripLinks(markdown: string): string {
  return markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1");
}

const link = (title: string, path: string) => `[${title}](/${path}.md)`;

export function compileKnowledge(files: SourceFile[]): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const docs: ParsedDoc[] = [];

  for (const file of files) {
    const path = file.path.replace(/\\/g, "/");
    const name = path.split("/").pop() ?? "";
    if (name === "index.md" || name === "log.md") continue; // Reservados (OKF §3.1).
    let parsed: ReturnType<typeof splitFrontmatter>;
    try {
      parsed = splitFrontmatter(file.content);
    } catch (error) {
      errors.push(`${path}: frontmatter YAML inválido (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (!parsed.frontmatter) {
      errors.push(`${path}: falta el bloque de frontmatter (OKF §4.1)`);
      continue;
    }
    if (!str(parsed.frontmatter.type)) {
      errors.push(`${path}: falta el campo obligatorio "type" (OKF §4.1)`);
      continue;
    }
    const segments = path.replace(/\.md$/, "").split("/");
    docs.push({
      path,
      dir: segments.length > 1 ? segments[0] : "",
      id: segments[segments.length - 1],
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      authored: authoredPart(parsed.body),
    });
  }

  const byDir = (dir: string) => docs.filter((d) => d.dir === dir).sort((a, b) => a.id.localeCompare(b.id));
  const conceptDocs = byDir(DIRS.concepts);
  const articleDocs = byDir(DIRS.articles);
  const areaDocs = byDir(DIRS.areas);
  const authorDocs = byDir(DIRS.authors);
  const workDocs = byDir(DIRS.works);

  const conceptIds = new Set(conceptDocs.map((d) => d.id));
  const areaIds = new Set(areaDocs.map((d) => d.id));
  const workIds = new Set(workDocs.map((d) => d.id));
  const titleOf = new Map(docs.map((d) => [`${d.dir}/${d.id}`, str(d.frontmatter.title) || d.id]));
  const conceptLink = (id: string) => link(titleOf.get(`${DIRS.concepts}/${id}`) ?? id, `${DIRS.concepts}/${id}`);

  const checkRefs = (doc: ParsedDoc, field: string, ids: string[], valid: Set<string>) => {
    for (const id of ids) {
      if (!valid.has(id)) errors.push(`${doc.path}: "${field}" apunta a "${id}", que no existe`);
    }
  };

  // --- Conceptos y relaciones SKOS (broader/related en frontmatter; narrower y la simetría de related se derivan).
  const broader = new Map<string, string[]>();
  const relatedSet = new Map<string, Set<string>>(conceptDocs.map((d) => [d.id, new Set<string>()]));
  for (const doc of conceptDocs) {
    const b = strList(doc.frontmatter.broader);
    const r = strList(doc.frontmatter.related);
    checkRefs(doc, "broader", b, conceptIds);
    checkRefs(doc, "related", r, conceptIds);
    if (!areaIds.has(str(doc.frontmatter.area))) errors.push(`${doc.path}: "area" desconocida: "${str(doc.frontmatter.area)}"`);
    if ([...b, ...r].includes(doc.id)) errors.push(`${doc.path}: un concepto no puede relacionarse consigo mismo`);
    broader.set(doc.id, b.filter((id) => conceptIds.has(id)));
    for (const id of r.filter((x) => conceptIds.has(x) && x !== doc.id)) {
      relatedSet.get(doc.id)?.add(id);
      relatedSet.get(id)?.add(doc.id);
    }
  }
  for (const id of conceptIds) {
    const seen = new Set<string>();
    const stack = [...(broader.get(id) ?? [])];
    while (stack.length) {
      const next = stack.pop()!;
      if (next === id) {
        errors.push(`${DIRS.concepts}/${id}.md: la jerarquía "broader" tiene un ciclo`);
        break;
      }
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(...(broader.get(next) ?? []));
    }
  }
  const narrower = new Map<string, string[]>([...conceptIds].map((id) => [id, [] as string[]]));
  for (const [id, parents] of broader) for (const parent of parents) narrower.get(parent)?.push(id);

  // --- Textos de Tomás
  const articlesByConcept = new Map<string, string[]>([...conceptIds].map((id) => [id, [] as string[]]));
  const articles: KnowledgeArticle[] = articleDocs.map((doc) => {
    const citation = str(doc.frontmatter.citation);
    const concepts = strList(doc.frontmatter.tags);
    const work = str(doc.frontmatter.work);
    checkRefs(doc, "tags", concepts, conceptIds);
    if (!workIds.has(work)) errors.push(`${doc.path}: "work" desconocida: "${work}"`);
    if (!citation) errors.push(`${doc.path}: falta "citation"`);
    const st = parseStCitation(citation);
    if (work === "summa-theologiae" && (!st || stSourceId(st) !== doc.id)) {
      errors.push(`${doc.path}: la cita "${citation}" no corresponde al id del archivo`);
    }
    const text = plainSummary(doc.authored);
    if (!text) errors.push(`${doc.path}: el cuerpo no tiene resumen`);
    for (const c of concepts) articlesByConcept.get(c)?.push(doc.id);
    return {
      id: doc.id,
      title: str(doc.frontmatter.title),
      description: str(doc.frontmatter.description),
      citation,
      work,
      url: str(doc.frontmatter.resource) || undefined,
      text,
      concepts: concepts.filter((c) => conceptIds.has(c)),
      keywords: strList(doc.frontmatter.keywords),
      status: lifecycle(doc.frontmatter.status),
      trust: trustTier(doc.frontmatter.verified),
    };
  });
  const articleById = new Map(articles.map((a) => [a.id, a]));

  const concepts: KnowledgeConcept[] = conceptDocs.map((doc) => {
    const labels = (doc.frontmatter.labels ?? {}) as Record<string, unknown>;
    const conceptArticles = articlesByConcept.get(doc.id) ?? [];
    if (conceptArticles.length === 0) warnings.push(`${doc.path}: ningún texto de Tomás está etiquetado con este concepto`);
    return {
      id: doc.id,
      title: str(doc.frontmatter.title),
      description: str(doc.frontmatter.description),
      descriptionEn: str(doc.frontmatter.description_en),
      area: str(doc.frontmatter.area),
      labels: { es: strList(labels.es), en: strList(labels.en), la: strList(labels.la) },
      definition: stripLinks(doc.authored),
      broader: broader.get(doc.id) ?? [],
      narrower: (narrower.get(doc.id) ?? []).sort(),
      related: [...(relatedSet.get(doc.id) ?? [])].sort(),
      articles: conceptArticles,
      status: lifecycle(doc.frontmatter.status),
      trust: trustTier(doc.frontmatter.verified),
    };
  });
  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  const areas: KnowledgeArea[] = areaDocs.map((doc) => ({
    id: doc.id,
    title: str(doc.frontmatter.title),
    titleEn: str(doc.frontmatter.title_en),
    description: str(doc.frontmatter.description),
  }));
  const authors: KnowledgeAuthor[] = authorDocs.map((doc) => {
    const c = strList(doc.frontmatter.concepts);
    checkRefs(doc, "concepts", c, conceptIds);
    return { id: doc.id, title: str(doc.frontmatter.title), description: str(doc.frontmatter.description), dates: str(doc.frontmatter.dates), concepts: c };
  });
  const works: KnowledgeWork[] = workDocs.map((doc) => ({
    id: doc.id,
    title: str(doc.frontmatter.title),
    description: str(doc.frontmatter.description),
    url: str(doc.frontmatter.resource) || undefined,
  }));

  // --- Enlaces del cuerpo: OKF tolera enlaces rotos (§6.1), así que solo se advierte.
  const existingPaths = new Set(docs.map((d) => `/${d.path}`));
  for (const doc of docs) {
    for (const [, target] of doc.authored.matchAll(/\]\((\/[^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
      if (!existingPaths.has(target)) warnings.push(`${doc.path}: enlace a ${target}, que todavía no existe`);
    }
  }

  // --- Secciones generadas (se reescriben siempre desde el frontmatter)
  // Orden canónico: Summa por parte, cuestión y artículo; después las demás obras por cita.
  const PART_ORDER = ["I", "I-II", "II-II", "III"];
  const citationKey = (id: string): [number, number, number, string] => {
    const citation = articleById.get(id)?.citation ?? id;
    const st = parseStCitation(citation);
    return st ? [PART_ORDER.indexOf(st.part), st.question, st.article, ""] : [PART_ORDER.length, 0, 0, citation];
  };
  const byCitation = (a: string, b: string) => {
    const [ka, kb] = [citationKey(a), citationKey(b)];
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2] || ka[3].localeCompare(kb[3]);
  };
  const articleLine = (id: string) => {
    const a = articleById.get(id);
    return `- ${link(a?.citation ?? id, `${DIRS.articles}/${id}`)} — ${a?.title ?? ""}`;
  };
  const generatedFor = (doc: ParsedDoc): string => {
    if (doc.dir === DIRS.concepts) {
      const c = conceptById.get(doc.id)!;
      const rel = [
        c.broader.length ? `- **Más amplio:** ${c.broader.map(conceptLink).join(", ")}` : "",
        c.narrower.length ? `- **Más específico:** ${c.narrower.map(conceptLink).join(", ")}` : "",
        c.related.length ? `- **Relacionado:** ${c.related.map(conceptLink).join(", ")}` : "",
        areaIds.has(c.area) ? `- **Área:** ${link(titleOf.get(`${DIRS.areas}/${c.area}`) ?? c.area, `${DIRS.areas}/${c.area}`)}` : "",
      ].filter(Boolean);
      const byAuthor = authors.filter((a) => a.concepts.includes(c.id));
      return [
        rel.length ? `# Relaciones\n\n${rel.join("\n")}` : "",
        c.articles.length ? `# Dónde lo trata Tomás\n\n${[...c.articles].sort(byCitation).map(articleLine).join("\n")}` : "",
        byAuthor.length ? `# Autores\n\n${byAuthor.map((a) => `- ${link(a.title, `${DIRS.authors}/${a.id}`)}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");
    }
    if (doc.dir === DIRS.articles) {
      const a = articleById.get(doc.id)!;
      const work = workIds.has(a.work) ? `\n\nObra: ${link(titleOf.get(`${DIRS.works}/${a.work}`) ?? a.work, `${DIRS.works}/${a.work}`)}.` : "";
      return `# Conceptos\n\n${a.concepts.map((c) => `- ${conceptLink(c)}`).join("\n")}${work}`;
    }
    if (doc.dir === DIRS.areas) {
      const inArea = concepts.filter((c) => c.area === doc.id);
      return inArea.length ? `# Conceptos\n\n${inArea.map((c) => `- ${conceptLink(c.id)} - ${c.description}`).join("\n")}` : "";
    }
    if (doc.dir === DIRS.authors) {
      const a = authors.find((x) => x.id === doc.id)!;
      return a.concepts.length ? `# Conceptos relacionados\n\n${a.concepts.map((c) => `- ${conceptLink(c)}`).join("\n")}` : "";
    }
    if (doc.dir === DIRS.works) {
      const inWork = articles.filter((a) => a.work === doc.id).map((a) => a.id).sort(byCitation);
      return inWork.length ? `# Textos en el bundle\n\n${inWork.map(articleLine).join("\n")}` : "";
    }
    return "";
  };

  const original = new Map(files.map((f) => [f.path.replace(/\\/g, "/"), f.content.replace(/\r\n/g, "\n")]));
  const outputs: SourceFile[] = [];
  for (const doc of docs) {
    const updated = withGeneratedBlock(original.get(doc.path) ?? "", generatedFor(doc));
    if (updated !== original.get(doc.path)) outputs.push({ path: doc.path, content: updated });
  }

  // --- index.md por directorio (OKF §8), con okf_version en la raíz (§12)
  const sections: { dir: string; heading: string; description: string; items: { id: string; title: string; description: string }[] }[] = [
    { dir: DIRS.areas, heading: "Áreas", description: "Grandes regiones del pensamiento de Tomás", items: areas },
    { dir: DIRS.concepts, heading: "Conceptos", description: "La ontología: conceptos con sus relaciones (más amplio, más específico, relacionado)", items: concepts },
    {
      dir: DIRS.articles,
      heading: "Textos de Tomás",
      description: "Pasajes de sus obras, con resumen y conceptos",
      items: [...articles].sort((a, b) => byCitation(a.id, b.id)).map((a) => ({ id: a.id, title: `${a.citation} — ${a.title}`, description: a.description })),
    },
    { dir: DIRS.authors, heading: "Autores", description: "Fuentes e interlocutores de Tomás", items: authors },
    { dir: DIRS.works, heading: "Obras", description: "Las obras de Tomás citadas en el bundle", items: works },
  ];
  for (const section of sections) {
    outputs.push({
      path: `${section.dir}/index.md`,
      content: `# ${section.heading}\n\n${section.items.map((i) => `* [${i.title}](${i.id}.md) - ${i.description}`).join("\n")}\n`,
    });
  }
  outputs.push({
    path: "index.md",
    content: `---\nokf_version: "${OKF_VERSION}"\n---\n\n# Santo Tomás de Aquino: bundle de conocimiento\n\n${sections
      .map((s) => `* [${s.heading}](${s.dir}/) - ${s.description} (${s.items.length})`)
      .join("\n")}\n`,
  });
  for (const output of [...outputs]) {
    if (output.path.endsWith("index.md") && original.get(output.path) === output.content) {
      outputs.splice(outputs.indexOf(output), 1);
    }
  }

  const bundle: KnowledgeBundle = { okfVersion: OKF_VERSION, articles, concepts, areas, authors, works };
  return { errors, warnings, outputs, bundle, ttl: toTurtle(bundle) };
}

// --- Exportación RDF compatible con OntologyEngine (schema:DefinedTerm, st:nameEs, st:narrowerThan, st:SummaArticle…)
const ST = "https://stotomas.ai/ontology/";
const SCHEMA = "http://schema.org/";
const lit = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
const uri = (id: string) => `<${ST}${id}>`;

export function toTurtle(bundle: KnowledgeBundle): string {
  const lines = [
    "# Generado por scripts/knowledge/build.ts desde knowledge/ (bundle OKF). No editar a mano.",
    `@prefix st: <${ST}> .`,
    `@prefix schema: <${SCHEMA}> .`,
    "",
  ];
  for (const c of bundle.concepts) {
    const props = [
      `<${SCHEMA}name> ${lit(c.labels.la[0] ?? c.labels.en[0] ?? c.title)}`,
      `<${ST}nameEs> ${lit(c.title)}`,
      `<${SCHEMA}description> ${lit(c.descriptionEn || c.description)}`,
      `<${ST}descriptionEs> ${lit(c.description)}`,
      ...c.broader.map((b) => `<${ST}narrowerThan> ${uri(b)}`),
      ...c.narrower.map((n) => `<${ST}broaderThan> ${uri(n)}`),
      ...c.related.map((r) => `<${ST}relatedTo> ${uri(r)}`),
    ];
    lines.push(`${uri(c.id)} a <${SCHEMA}DefinedTerm> ;\n    ${props.join(" ;\n    ")} .`, "");
  }
  for (const a of bundle.articles) {
    const props = [
      `<${SCHEMA}name> ${lit(a.title)}`,
      `<${ST}citation> ${lit(a.citation)}`,
      `<${ST}text> ${lit(a.text)}`,
      ...a.concepts.map((c) => `<${ST}hasTopic> ${uri(c)}`),
    ];
    lines.push(`${uri(a.id)} a <${ST}SummaArticle> ;\n    ${props.join(" ;\n    ")} .`, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** Texto que se embebe por documento; su hash detecta embeddings desactualizados. */
export function embeddingInputs(bundle: KnowledgeBundle): { key: string; text: string; hash: string }[] {
  const conceptTitle = new Map(bundle.concepts.map((c) => [c.id, c.title]));
  const inputs = [
    ...bundle.articles.map((a) => ({
      key: `article:${a.id}`,
      text: [a.citation, a.title, a.text, `Concepts: ${a.concepts.map((c) => conceptTitle.get(c) ?? c).join(", ")}`].join("\n"),
    })),
    ...bundle.concepts.map((c) => ({
      key: `concept:${c.id}`,
      text: [c.title, [...c.labels.es, ...c.labels.en, ...c.labels.la].join(", "), c.description, c.descriptionEn, c.definition].join("\n"),
    })),
  ];
  return inputs.map((i) => ({ ...i, hash: createHash("sha256").update(i.text).digest("hex").slice(0, 16) }));
}
