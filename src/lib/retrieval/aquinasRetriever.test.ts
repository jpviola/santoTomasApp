import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    sourceLocalization: {
      findMany: vi.fn().mockRejectedValue(new Error("no database")),
      upsert: vi.fn().mockRejectedValue(new Error("no database")),
    },
  },
}));

vi.mock("@/lib/llm/callModel", () => ({
  callModel: vi.fn(async () =>
    JSON.stringify([{ id: "scg-i-c7", title: "Que la verdad de la razón no se opone a la fe", text: "Resumen traducido." }]),
  ),
}));

import { knowledge } from "@/lib/knowledge/bundle";
import { hydrateAquinasSources, retrieveAquinasSources, tokenize } from "@/lib/retrieval/aquinasRetriever";
import { lociToSources } from "@/lib/retrieval/retrieveSources";
import { parseStCitation } from "@/lib/retrieval/summaText";

describe("corpus integrity", () => {
  it("has unique ids, and ids of Summa entries match their citation", () => {
    const ids = knowledge.articles.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of knowledge.articles) {
      const citation = parseStCitation(entry.citation);
      if (citation) {
        expect(entry.id).toBe(`st-${citation.part.toLowerCase()}-q${citation.question}-a${citation.article}`);
      }
      if (entry.textKind === "summary") expect(entry.keywords.length).toBeGreaterThan(0);
    }
  });
});

describe("tokenize", () => {
  it("drops accents, stopwords and simple plurals", () => {
    expect(tokenize("¿Qué es la ley natural según Tomás?")).toEqual(["ley", "natural"]);
    expect(tokenize("Las virtudes cardinales")).toEqual(["virtud", "cardinal"]);
  });
});

describe("retrieveAquinasSources", () => {
  it.each([
    ["¿Qué es la ley natural?", "st-i-ii-q94-a2"],
    ["What is natural law?", "st-i-ii-q94-a2"],
    ["¿Existe Dios? Demuéstralo con cinco vías.", "st-i-q2-a3"],
    ["¿El alma humana es inmortal?", "st-i-q75-a6"],
    ["¿Es lícito robar por necesidad?", "st-ii-ii-q66-a7"],
    ["¿Cuándo es justa una guerra?", "st-ii-ii-q40-a1"],
    ["¿Qué diferencia hay entre esencia y existencia?", "st-i-q3-a4"],
  ])("finds a relevant locus for %s", (question, expectedId) => {
    const ids = retrieveAquinasSources(question, 4).map((s) => s.id);
    expect(ids).toContain(expectedId);
  });

  it("returns nothing for an off-topic question instead of unrelated sources", () => {
    expect(retrieveAquinasSources("receta de pizza napolitana", 4)).toEqual([]);
  });

  it("marks corpus sources as summaries", () => {
    expect(retrieveAquinasSources("ley natural", 1)[0]?.kind).toBe("summary");
  });
});

describe("lociToSources", () => {
  it("parses, deduplicates and prefers corpus entries", () => {
    const sources = lociToSources(["ST I-II, q.94, a.2", "I-II q.94 a.2", "ST I, q.117, a.9", "not a citation"]);
    expect(sources.map((s) => s.id)).toEqual(["st-i-ii-q94-a2", "st-i-q117-a9"]);
    expect(sources[0].text.length).toBeGreaterThan(0);
    expect(sources[1].text).toBe("");
  });
});

describe("hydrateAquinasSources", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replaces a Summa summary with the real text and drops loci that cannot be verified", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("1002")) {
        return new Response(
          `<h2>Article 3. Whether God exists?</h2><p>I answer that, The existence of God can be proved in five ways. The first and more manifest way is the argument from motion.</p><p>Reply to Objection 1.</p>`,
          { status: 200 },
        );
      }
      return new Response("<p>Article 1. Whether something else?</p>", { status: 200 });
    });

    const [fiveWays, invented] = lociToSources(["ST I, q.2, a.3", "ST I, q.118, a.9"]);
    const hydrated = await hydrateAquinasSources([fiveWays, invented], "en");

    expect(hydrated).toHaveLength(1);
    expect(hydrated[0].kind).toBe("text");
    expect(hydrated[0].title).toBe("Whether God exists?");
    expect(hydrated[0].text).toMatch(/^I answer that, The existence of God can be proved in five ways/);
    expect(hydrated[0].url).toBe("https://www.newadvent.org/summa/1002.htm#article3");
  });

  it("keeps the summary when the site is unreachable, and translates non-Summa summaries", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const sources = [...lociToSources(["ST I, q.2, a.3"]), ...retrieveAquinasSources("verdad de la razón fe contradicción SCG", 4).filter((s) => s.id === "scg-i-c7")];

    const hydrated = await hydrateAquinasSources(sources, "es");
    const scg = hydrated.find((s) => s.id === "scg-i-c7");
    expect(hydrated.find((s) => s.id === "st-i-q2-a3")?.kind).toBe("summary");
    expect(scg?.text).toBe("Resumen traducido.");
  });
});
