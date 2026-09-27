import { sharedThomisticRules } from "@/lib/prompts/sharedRules";
import type { Audience, SourceSnippet } from "@/lib/schemas/debate";

export type DebateLanguage = "en" | "es" | "la";

const LANGUAGE_LABEL: Record<DebateLanguage, string> = {
  en: "English",
  es: "Spanish",
  la: "Latin",
};

// Fórmulas tradicionales del artículo escolástico en cada idioma.
const FORMULAS: Record<DebateLanguage, { objection: string; further: string; sedContra: string; respondeo: string; reply: string }> = {
  en: {
    objection: '"It seems that..."',
    further: '"Further..."',
    sedContra: '"On the contrary..."',
    respondeo: '"I answer that..."',
    reply: '"To the first, it must be said that..." / "To the second..."',
  },
  es: {
    objection: '"Parece que..."',
    further: '"Además..."',
    sedContra: '"En cambio..."',
    respondeo: '"Respondo que..."',
    reply: '"A la primera hay que decir que..." / "A la segunda..."',
  },
  la: {
    objection: '"Videtur quod..."',
    further: '"Praeterea..."',
    sedContra: '"Sed contra..."',
    respondeo: '"Respondeo dicendum quod..."',
    reply: '"Ad primum ergo dicendum quod..." / "Ad secundum..."',
  },
};

const AUDIENCE_GUIDANCE: Record<Audience, string> = {
  undergraduate:
    "An intelligent newcomer to philosophy. Define every technical term the first time it appears, use one concrete example in the respondeo, and keep Latin to a few glossed key terms.",
  graduate:
    "A student of philosophy or theology. Use technical vocabulary precisely, name the relevant loci in Aquinas and his sources (Aristotle, Augustine, Pseudo-Dionysius) where they matter, and make the distinctions explicit.",
  seminary:
    "A specialist. Use full technical precision and Latin terminology, engage the theological sources, and mention the Thomistic commentatorial tradition (e.g. Cajetan) only when you are certain of what it holds.",
};

export function buildDebateSystemPrompt(language: DebateLanguage): string {
  const f = FORMULAS[language];
  return `
${sharedThomisticRules}

You are a master of scholastic disputation. You write one disputed article, in the manner of the Summa Theologiae, answering the question as Aquinas himself would.

Form of the article:
1. "objections": exactly 3 of the strongest arguments AGAINST the position Aquinas actually holds. Each is a genuine argument (premises leading to a conclusion), never a straw man, drawing on the kinds of authorities and reasons his opponents used (Scripture, Aristotle, Augustine, common experience, or a contemporary view when relevant). Begin the first with ${f.objection} and the others with ${f.further}. Do not number them.
2. "sedContra": a brief appeal to an authority (Scripture, a Church Father, Aristotle, or Aquinas's own text) pointing toward the true answer. Begin with ${f.sedContra}.
3. "respondeo": the heart of the article. Begin with ${f.respondeo}. (a) Define the key terms and introduce the decisive distinction; (b) argue from principles, following Aquinas's own order of reasoning; (c) state the determination clearly. Write 3 to 5 paragraphs separated by a blank line (\\n\\n). When you rely on a text, name its place in parentheses, e.g. (ST I-II, q.94, a.2).
4. "replies": exactly one reply per objection, in the same order. Begin with ${f.reply}. Each reply must answer the specific premise of its objection, usually by applying a distinction from the respondeo, and concede what is true in it; do not merely repeat the conclusion.
5. "application": one paragraph connecting the determination to a contemporary question or to the reader's life, without slogans or preaching.

Fidelity rules:
- If Aquinas never addressed the topic (e.g. artificial intelligence, modern technologies), reason from his principles and say explicitly in the respondeo that this is an extension of his thought, not his text.
- If the question presupposes something Aquinas would reject, correct the presupposition through a distinction rather than accepting it.
- If his position is disputed among interpreters, or developed across his works, note it briefly.
- The numbered Sources below are real texts of Aquinas or faithful summaries of them. Ground the respondeo in them where relevant and ignore any that are off-topic.
- Quote verbatim ONLY from the Sources. You may cite other loci of Aquinas or other authorities only when you are certain of them; otherwise paraphrase without a precise reference.
- Where the Moderator lists distinctions, use them.

Write every JSON string in ${LANGUAGE_LABEL[language]}.${language === "la" ? "" : " Keep key Latin technical terms (esse, actus, potentia, habitus, synderesis...) where helpful, glossed on first use."}
Return only a JSON object with this shape:
{
  "objections": ["string", "string", "string"],
  "sedContra": "string",
  "respondeo": "string",
  "replies": ["string", "string", "string"],
  "application": "string"
}
`;
}

type DebateUserPromptParams = {
  question: string;
  audience: Audience;
  language: DebateLanguage;
  context?: string;
  framing?: string;
  precisionNotes?: string[];
  ontologyTerms?: string[];
  sources: SourceSnippet[];
};

export function formatSourcesForPrompt(sources: SourceSnippet[]): string {
  if (sources.length === 0) return "No sources retrieved. Rely on your knowledge of Aquinas, citing only loci you are certain of.";
  return sources
    .map(
      (s, i) => `[${i + 1}] ${s.citation} (${s.kind === "text" ? "text of Aquinas" : "summary"})
Title: ${s.title}
${s.text}`,
    )
    .join("\n\n");
}

export function buildDebateUserPrompt({
  question,
  audience,
  language,
  context,
  framing,
  precisionNotes = [],
  ontologyTerms = [],
  sources,
}: DebateUserPromptParams): string {
  const sections = [
    `Question:\n${question}`,
    `Audience:\n${AUDIENCE_GUIDANCE[audience]}`,
    `Target language:\n${LANGUAGE_LABEL[language]}`,
  ];
  if (context) sections.push(`Context provided by the reader:\n${context}`);
  if (framing) sections.push(`Moderator's framing:\n${framing}`);
  if (precisionNotes.length) sections.push(`Distinctions the answer must draw:\n${precisionNotes.map((n) => `- ${n}`).join("\n")}`);
  if (ontologyTerms.length) {
    sections.push(`Related concepts from the Thomistic knowledge base:\n${ontologyTerms.map((term) => `- ${term}`).join("\n")}`);
  }
  sections.push(`Sources:\n${formatSourcesForPrompt(sources)}`);
  sections.push("Return JSON only.");
  return sections.join("\n\n");
}
