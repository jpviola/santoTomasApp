import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDebate } from "@/lib/orchestrator/runDebate";

const sampleSource = {
  id: "st-1-q16-a1",
  title: "Whether truth resides only in the intellect?",
  citation: "ST I, q.16, a.1",
  text: "Truth resides primarily in the intellect.",
};

const debateResult = {
  objections: ["Obj 1", "Obj 2", "Obj 3"],
  sedContra: "Sed contra text.",
  respondeo: "Respondeo text.",
  replies: ["Reply 1", "Reply 2", "Reply 3"],
  application: "Application text.",
};

vi.mock("@/lib/agents/OntologyEngine", () => ({
  getOntologyEngine: () => ({
    findRelevantTerms: vi.fn().mockResolvedValue([
      { id: "https://stotomas.ai/ontology/Truth", name: "Veritas", description: "Truth" },
    ]),
  }),
}));

vi.mock("@/lib/agents/moderator", () => ({
  runModerator: vi.fn().mockResolvedValue({
    question: "Utrum veritas sit?",
    framing: "Framing.",
    precisionNotes: [],
    ontologyTopics: [],
  }),
}));

vi.mock("@/lib/agents/scholasticDebate", () => ({
  runScholasticDebate: vi.fn(async () => debateResult),
}));

vi.mock("@/lib/retrieval/ontologyRetriever", () => ({
  retrieveOntologyEnrichedSources: vi.fn(async () => [sampleSource]),
}));

vi.mock("@/lib/retrieval/aquinasRetriever", () => ({
  localizeAquinasSources: vi.fn(async (sources: unknown[]) => sources),
}));

describe("runDebate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produces a validated DebateOutput using the moderated question", async () => {
    const result = await runDebate({
      question: "Does truth exist?",
      audience: "graduate",
      language: "en",
    });

    expect(result.question).toBe("Utrum veritas sit?");
    expect(result.objections).toEqual(debateResult.objections);
    expect(result.replies).toHaveLength(3);
    expect(result.sources).toEqual([sampleSource]);
    expect(result.metadata.audience).toBe("graduate");
    expect(new Date(result.metadata.generatedAt).getTime()).not.toBeNaN();
  });

  it("emits progress updates in pipeline order up to 100", async () => {
    const stages: string[] = [];
    const progress: number[] = [];

    await runDebate(
      { question: "Does truth exist?", audience: "graduate", language: "en" },
      {
        onProgress: (update) => {
          stages.push(update.stage);
          progress.push(update.progress);
        },
      },
    );

    expect(stages).toEqual([
      "start",
      "moderate_and_retrieve",
      "objections_and_sed_contra",
      "respondeo",
      "finalize",
      "done",
    ]);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(progress.at(-1)).toBe(100);
  });

  it("localizes sources when the language is not English", async () => {
    const { localizeAquinasSources } = await import("@/lib/retrieval/aquinasRetriever");

    await runDebate({ question: "¿Existe la verdad?", audience: "graduate", language: "es" });
    expect(localizeAquinasSources).toHaveBeenCalledWith([sampleSource], "es");
  });

  it("skips localization for English", async () => {
    const { localizeAquinasSources } = await import("@/lib/retrieval/aquinasRetriever");

    await runDebate({ question: "Does truth exist?", audience: "graduate", language: "en" });
    expect(localizeAquinasSources).not.toHaveBeenCalled();
  });

  it("rejects an invalid input", async () => {
    await expect(runDebate({ question: "abc", audience: "graduate", language: "en" })).rejects.toThrow();
  });
});
