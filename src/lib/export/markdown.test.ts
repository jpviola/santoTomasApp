import { describe, it, expect } from "vitest";
import { buildDebateMarkdown } from "@/lib/export/markdown";

describe("buildDebateMarkdown", () => {
  const baseDebate = {
    id: "test-id",
    question: "Is the human soul immortal?",
    audience: "graduate",
    context: "Philosophical Anthropology course",
    objections: ["The soul depends on the body.", "Materialism denies immaterial substances.", "Science finds no evidence."],
    sedContra: "On the contrary, Aquinas argues the intellect is immaterial and subsistent.",
    respondeo: "I answer that the human soul is immortal because...",
    replies: ["The dependence is operational, not existential.", "Materialism is a philosophical assumption, not a scientific finding.", "Absence of evidence is not evidence of absence."],
    application: "This has implications for bioethics and human dignity.",
    sources: [
      {
        id: "1",
        title: "Summa Theologiae I, q.75, a.6",
        citation: "ST I, q.75, a.6",
        text: "Whether the human soul is incorruptible?",
      },
    ],
    generatedAt: "2024-06-15T10:00:00.000Z",
    createdAt: "2024-06-15T09:00:00.000Z",
  };

  it("generates markdown with all sections", () => {
    const { filename, content } = buildDebateMarkdown(baseDebate);

    expect(filename).toContain("is-the-human-soul-immortal");
    expect(filename).toMatch(/\.md$/);
    expect(content).toContain("# Is the human soul immortal?");
    expect(content).toContain("## Objections");
    expect(content).toContain("## Sed Contra");
    expect(content).toContain("## Respondeo");
    expect(content).toContain("## Replies to Objections");
    expect(content).toContain("## Contemporary Application");
    expect(content).toContain("## Sources");
  });

  it("includes frontmatter metadata", () => {
    const { content } = buildDebateMarkdown(baseDebate);

    expect(content).toContain('title: "Is the human soul immortal?"');
    expect(content).toContain('type: "digital-aquinas-debate"');
    expect(content).toContain('tradition: "thomistic"');
  });

  it("includes context block when present", () => {
    const { content } = buildDebateMarkdown(baseDebate);
    expect(content).toContain("## Context");
    expect(content).toContain("Philosophical Anthropology course");
  });

  it("omits context block when not present", () => {
    const { content } = buildDebateMarkdown({ ...baseDebate, context: undefined });
    expect(content).not.toContain("## Context");
  });

  it("formats objections as numbered list", () => {
    const { content } = buildDebateMarkdown(baseDebate);
    expect(content).toContain("1. The soul depends on the body.");
    expect(content).toContain("2. Materialism denies immaterial substances.");
  });

  it("includes source citations in frontmatter", () => {
    const { content } = buildDebateMarkdown(baseDebate);
    expect(content).toContain("sourceCitations:");
    expect(content).toContain("ST I, q.75, a.6");
  });

  it("applies custom overrides", () => {
    const { content } = buildDebateMarkdown(baseDebate, {
      course: "Custom Course",
      topic: "custom-topic",
      status: "draft",
    });

    expect(content).toContain('course: "Custom Course"');
    expect(content).toContain('topic: "custom-topic"');
    expect(content).toContain('status: "draft"');
  });

  it("infers topic from question keywords", () => {
    const aiDebate = { ...baseDebate, question: "Can artificial intelligence truly understand?" };
    const { content } = buildDebateMarkdown(aiDebate);
    expect(content).toContain('topic: "artificial-intelligence"');
  });

  it("infers question type from question structure", () => {
    const normativeDebate = { ...baseDebate, question: "Should we always tell the truth?" };
    const { content } = buildDebateMarkdown(normativeDebate);
    expect(content).toContain('questionType: "normative"');
  });

  it("handles empty sources gracefully", () => {
    const noSources = { ...baseDebate, sources: [] };
    const { content } = buildDebateMarkdown(noSources);
    expect(content).toContain("## Sources");
  });
});
