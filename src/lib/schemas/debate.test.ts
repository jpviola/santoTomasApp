import { describe, it, expect } from "vitest";
import {
  DebateInputSchema,
  AudienceSchema,
  SourceSnippetSchema,
  DebateOutputSchema,
  parseDebateInput,
} from "@/lib/schemas/debate";

describe("AudienceSchema", () => {
  it("accepts valid audiences", () => {
    expect(AudienceSchema.parse("undergraduate")).toBe("undergraduate");
    expect(AudienceSchema.parse("graduate")).toBe("graduate");
    expect(AudienceSchema.parse("seminary")).toBe("seminary");
  });

  it("rejects invalid audiences", () => {
    expect(() => AudienceSchema.parse("highschool")).toThrow();
    expect(() => AudienceSchema.parse("")).toThrow();
  });
});

describe("DebateInputSchema", () => {
  it("accepts valid input with minimum question length", () => {
    const result = DebateInputSchema.parse({ question: "What is truth?" });
    expect(result.question).toBe("What is truth?");
    expect(result.audience).toBe("graduate");
    expect(result.language).toBe("es");
  });

  it("rejects questions shorter than 5 characters", () => {
    expect(() => DebateInputSchema.parse({ question: "Hi" })).toThrow();
  });

  it("accepts optional context", () => {
    const result = DebateInputSchema.parse({
      question: "What is the nature of consciousness?",
      context: "Philosophy of mind course, week 5",
    });
    expect(result.context).toBe("Philosophy of mind course, week 5");
  });

  it("defaults audience to graduate", () => {
    const result = DebateInputSchema.parse({ question: "Is free will compatible with determinism?" });
    expect(result.audience).toBe("graduate");
  });

  it("accepts all language options", () => {
    expect(DebateInputSchema.parse({ question: "What is truth?", language: "en" }).language).toBe("en");
    expect(DebateInputSchema.parse({ question: "What is truth?", language: "es" }).language).toBe("es");
    expect(DebateInputSchema.parse({ question: "What is truth?", language: "la" }).language).toBe("la");
  });
});

describe("SourceSnippetSchema", () => {
  it("accepts valid source", () => {
    const result = SourceSnippetSchema.parse({
      id: "1",
      title: "Summa Theologiae I, q.2, a.3",
      citation: "ST I, q.2, a.3",
      text: "Whether God exists?",
    });
    expect(result.id).toBe("1");
  });

  it("accepts optional url", () => {
    const result = SourceSnippetSchema.parse({
      id: "1",
      title: "Test",
      citation: "Test",
      text: "Test",
      url: "https://example.com",
    });
    expect(result.url).toBe("https://example.com");
  });

  it("rejects invalid url", () => {
    expect(() =>
      SourceSnippetSchema.parse({
        id: "1",
        title: "Test",
        citation: "Test",
        text: "Test",
        url: "not-a-url",
      }),
    ).toThrow();
  });
});

describe("parseDebateInput", () => {
  it("normalizes topic to question", () => {
    const result = parseDebateInput({ topic: "What is the nature of being?" });
    expect(result.question).toBe("What is the nature of being?");
  });

  it("preserves question when both topic and question present", () => {
    const result = parseDebateInput({ question: "What is truth?", topic: "ignored" });
    expect(result.question).toBe("What is truth?");
  });

  it("throws on invalid input", () => {
    expect(() => parseDebateInput({})).toThrow();
    expect(() => parseDebateInput("not an object")).toThrow();
    expect(() => parseDebateInput([])).toThrow();
  });

  it("throws on short question", () => {
    expect(() => parseDebateInput({ question: "abc" })).toThrow();
  });
});

describe("DebateOutputSchema", () => {
  const validOutput = {
    question: "What is truth?",
    objections: ["Objection 1", "Objection 2", "Objection 3"],
    sedContra: "On the contrary...",
    respondeo: "I answer that...",
    replies: ["Reply 1", "Reply 2", "Reply 3"],
    application: "Contemporary application...",
    sources: [
      {
        id: "1",
        title: "ST I, q.2, a.3",
        citation: "ST I, q.2, a.3",
        text: "Whether God exists?",
      },
    ],
    metadata: {
      audience: "graduate" as const,
      generatedAt: "2024-01-01T00:00:00.000Z",
    },
  };

  it("accepts valid debate output", () => {
    const result = DebateOutputSchema.parse(validOutput);
    expect(result.question).toBe("What is truth?");
    expect(result.objections).toHaveLength(3);
  });

  it("accepts optional recordId", () => {
    const result = DebateOutputSchema.parse({ ...validOutput, recordId: "clx123" });
    expect(result.recordId).toBe("clx123");
  });

  it("rejects missing required fields", () => {
    const invalid = { ...validOutput };
    delete (invalid as Record<string, unknown>).sedContra;
    expect(() => DebateOutputSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid audience in metadata", () => {
    expect(() =>
      DebateOutputSchema.parse({
        ...validOutput,
        metadata: { audience: "invalid", generatedAt: "2024-01-01T00:00:00.000Z" },
      }),
    ).toThrow();
  });
});
