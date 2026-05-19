import { describe, it, expect } from "vitest";
import { rankSources } from "@/lib/retrieval/rankSources";

describe("rankSources", () => {
  const sources = [
    { id: "1", title: "On Truth", citation: "ST", text: "Truth is the adequation of intellect and reality." },
    { id: "2", title: "On Being", citation: "ST", text: "Being is the most fundamental concept." },
    { id: "3", title: "On Knowledge", citation: "ST", text: "Knowledge begins with the senses." },
  ];

  it("returns sources sorted by relevance", async () => {
    const result = await rankSources({ query: "truth", sources, limit: 3 });
    expect(result[0].title).toBe("On Truth");
  });

  it("respects the limit", async () => {
    const result = await rankSources({ query: "truth", sources, limit: 1 });
    expect(result).toHaveLength(1);
  });

  it("returns all sources when query is empty", async () => {
    const result = await rankSources({ query: "", sources, limit: 10 });
    expect(result).toHaveLength(3);
  });

  it("returns empty array when sources is empty", async () => {
    const result = await rankSources({ query: "test", sources: [], limit: 5 });
    expect(result).toHaveLength(0);
  });
});
