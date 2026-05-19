import type { ExportOverrides } from "@/lib/schemas/export";

type ExportableDebate = {
  id?: string;
  question: string;
  audience: string;
  context?: string | null;
  objections: string[];
  sedContra: string;
  respondeo: string;
  replies: string[];
  application: string;
  sources: Array<{
    id: string;
    title: string;
    citation: string;
    text: string;
  }>;
  generatedAt: string | Date;
  createdAt?: string | Date;
};

type FrontmatterMetadata = {
  course?: string;
  module?: string;
  topic: string;
  tradition: string;
  questionType: string;
  primaryTags: string[];
  secondaryTags: string[];
  sourceCitations: string[];
  exportedFrom: string;
  status: string;
  archivePath?: string;
};

function formatDate(value: string | Date | undefined): string {
  if (!value) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function escapeYamlString(value: string): string {
  return value.replace(/"/g, '\\"');
}

function escapePipes(text: string): string {
  return text.replace(/\|/g, "\\|");
}

function normalizeTag(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function inferTopic(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("artificial intelligence") || q.includes("ai")) return "artificial-intelligence";
  if (q.includes("intellect") || q.includes("understand") || q.includes("understanding")) return "intellect-and-understanding";
  if (q.includes("human person") || q.includes("person")) return "philosophical-anthropology";
  if (q.includes("law")) return "law-and-common-good";
  if (q.includes("virtue")) return "virtue-ethics";
  if (q.includes("faith") || q.includes("reason")) return "faith-and-reason";
  if (q.includes("happiness")) return "happiness";
  if (q.includes("technology")) return "technology";
  if (q.includes("being")) return "metaphysics";
  if (q.includes("soul")) return "soul";
  if (q.includes("consciousness")) return "consciousness";

  return "philosophy-theology";
}

function inferQuestionType(question: string): string {
  const q = question.toLowerCase();

  if (q.startsWith("whether")) return "quaestio";
  if (q.includes("can")) return "possibility";
  if (q.includes("is") || q.includes("are")) return "definition";
  if (q.includes("should")) return "normative";
  if (q.includes("why")) return "explanatory";

  return "scholastic-inquiry";
}

function inferCourse(question: string, topic: string): string | undefined {
  const q = question.toLowerCase();

  if (q.includes("human person") || q.includes("person") || q.includes("soul") || q.includes("intellect")) {
    return "Philosophical Anthropology";
  }

  if (q.includes("faith") || q.includes("reason") || q.includes("god") || q.includes("grace")) {
    return "Fundamental Theology";
  }

  if (q.includes("law") || q.includes("virtue") || q.includes("happiness")) {
    return "Ethics";
  }

  if (topic === "metaphysics") {
    return "Metaphysics";
  }

  if (q.includes("artificial intelligence") || q.includes("technology") || q.includes("consciousness")) {
    return "Philosophy of Technology";
  }

  return undefined;
}

function inferModule(topic: string, question: string): string | undefined {
  const q = question.toLowerCase();

  if (topic === "artificial-intelligence") return "AI and Human Intelligence";
  if (topic === "intellect-and-understanding") return "Intellect and Knowledge";
  if (topic === "philosophical-anthropology") return "The Human Person";
  if (topic === "law-and-common-good") return "Law and the Common Good";
  if (topic === "virtue-ethics") return "Virtue and Moral Formation";
  if (topic === "faith-and-reason") return "Faith, Reason, and Truth";
  if (topic === "metaphysics") return "Being and First Principles";
  if (q.includes("consciousness")) return "Consciousness and Subjectivity";

  return undefined;
}

function inferSecondaryTags(debate: ExportableDebate): string[] {
  const tags = ["scholastic-method", "multi-agent", "source-grounded"];

  const sourceTitles = debate.sources.map((s) => s.title.toLowerCase()).join(" ");

  if (sourceTitles.includes("summa theologiae")) tags.push("summa-theologiae");
  if (debate.context) tags.push("contextualized");
  if (debate.sources.length > 0) tags.push("citation-backed");
  if (debate.replies.length >= 3) tags.push("full-disputation");

  return uniqueStrings(tags);
}

function inferFrontmatterMetadata(debate: ExportableDebate, overrides?: ExportOverrides): FrontmatterMetadata {
  const topic = overrides?.topic?.trim() || inferTopic(debate.question);
  const questionType = inferQuestionType(debate.question);
  const primaryTags = inferPrimaryTags(
    debate,
    topic,
    questionType,
    overrides?.customTags ?? [],
  );
  const secondaryTags = inferSecondaryTags(debate);
  const sourceCitations = uniqueStrings(debate.sources.map((s) => s.citation));

  return {
    course: overrides?.course?.trim() || inferCourse(debate.question, topic),
    module: overrides?.module?.trim() || inferModule(topic, debate.question),
    topic,
    tradition: "thomistic",
    questionType,
    primaryTags,
    secondaryTags,
    sourceCitations,
    exportedFrom: "digital-aquinas",
    status: overrides?.status?.trim() || "evergreen",
    archivePath: overrides?.archivePath?.trim() || undefined,
  };
}

function inferPrimaryTags(
  debate: ExportableDebate,
  topic: string,
  questionType: string,
  customTags: string[] = [],
): string[] {
  const tags = [
    "digital-aquinas",
    "debate",
    "thomism",
    topic,
    questionType,
    normalizeTag(debate.audience),
    ...customTags.map(normalizeTag),
  ];

  const q = debate.question.toLowerCase();

  if (q.includes("artificial intelligence") || q.includes("ai")) tags.push("ai");
  if (q.includes("understand") || q.includes("intellect")) tags.push("intellect");
  if (q.includes("person")) tags.push("person");
  if (q.includes("law")) tags.push("law");
  if (q.includes("virtue")) tags.push("virtue");
  if (q.includes("faith")) tags.push("faith");
  if (q.includes("reason")) tags.push("reason");
  if (q.includes("technology")) tags.push("technology");
  if (q.includes("consciousness")) tags.push("consciousness");
  if (q.includes("soul")) tags.push("soul");
  if (q.includes("being")) tags.push("being");

  return uniqueStrings(tags);
}

export function buildDebateMarkdown(
  debate: ExportableDebate,
  overrides?: ExportOverrides,
): { filename: string; content: string } {
  const generatedAt = formatDate(debate.generatedAt);
  const createdAt = formatDate(debate.createdAt);
  const metadata = inferFrontmatterMetadata(debate, overrides);

  const filename = `${slugify(debate.question)}.md`;

  const frontmatterLines = [
    "---",
    `title: "${escapeYamlString(debate.question)}"`,
    `type: "digital-aquinas-debate"`,
    metadata.course ? `course: "${escapeYamlString(metadata.course)}"` : undefined,
    metadata.module ? `module: "${escapeYamlString(metadata.module)}"` : undefined,
    `topic: "${metadata.topic}"`,
    `tradition: "${metadata.tradition}"`,
    `questionType: "${metadata.questionType}"`,
    `audience: "${escapeYamlString(debate.audience)}"`,
    `generatedAt: "${generatedAt}"`,
    `createdAt: "${createdAt}"`,
    debate.id ? `recordId: "${debate.id}"` : undefined,
    `exportedFrom: "${metadata.exportedFrom}"`,
    `status: "${metadata.status}"`,
    metadata.archivePath ? `archivePath: "${escapeYamlString(metadata.archivePath)}"` : undefined,
    "primaryTags:",
    ...metadata.primaryTags.map((tag) => `  - ${tag}`),
    "secondaryTags:",
    ...metadata.secondaryTags.map((tag) => `  - ${tag}`),
    "sourceCitations:",
    ...metadata.sourceCitations.map((citation) => `  - "${escapeYamlString(citation)}"`),
    "---",
  ].filter(Boolean) as string[];

  const objections = debate.objections.map((item, index) => `${index + 1}. ${item}`).join("\n");

  const replies = debate.replies.map((item, index) => `${index + 1}. ${item}`).join("\n");

  const sources = debate.sources
    .map((source, index) =>
      [
        `### Source ${index + 1}`,
        `- **Title:** ${escapePipes(source.title)}`,
        `- **Citation:** ${escapePipes(source.citation)}`,
        "",
        source.text,
      ].join("\n"),
    )
    .join("\n\n");

  const contextBlock = debate.context ? `## Context\n\n${debate.context}\n` : "";

  const content = [
    frontmatterLines.join("\n"),
    "",
    `# ${debate.question}`,
    "",
    `- **Audience:** ${debate.audience}`,
    `- **Generated:** ${generatedAt}`,
    metadata.course ? `- **Course:** ${metadata.course}` : undefined,
    metadata.module ? `- **Module:** ${metadata.module}` : undefined,
    `- **Topic:** ${metadata.topic}`,
    metadata.archivePath ? `- **Archive Path Hint:** ${metadata.archivePath}` : undefined,
    debate.id ? `- **Record ID:** ${debate.id}` : undefined,
    "",
    contextBlock,
    "## Objections",
    "",
    objections,
    "",
    "## Sed Contra",
    "",
    debate.sedContra,
    "",
    "## Respondeo",
    "",
    debate.respondeo,
    "",
    "## Replies to Objections",
    "",
    replies,
    "",
    "## Contemporary Application",
    "",
    debate.application,
    "",
    "## Sources",
    "",
    sources || "_No sources available._",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    filename,
    content,
  };
}
