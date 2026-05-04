import type { SourceSnippet } from "@/lib/schemas/source";

export type RankSourcesInput = {
  query: string;
  sources: SourceSnippet[];
  limit?: number;
};

export const rankSources = async (input: RankSourcesInput): Promise<SourceSnippet[]> => {
  const q = input.query.toLowerCase();
  const scored = input.sources
    .map((s) => {
      const hay = `${s.title}\n${s.text}\n${s.citation}`.toLowerCase();
      const score = q.length === 0 ? 0 : hay.includes(q) ? 2 : 1;
      return { source: s, score };
    })
    .sort((a, b) => b.score - a.score);

  const limit = input.limit ?? input.sources.length;
  return scored.slice(0, limit).map((x) => x.source);
};
