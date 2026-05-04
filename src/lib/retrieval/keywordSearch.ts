import type { SourceSnippet } from "@/lib/schemas/source";

export type KeywordSearchInput = {
  query: string;
  limit?: number;
};

export const keywordSearch = async (input: KeywordSearchInput): Promise<SourceSnippet[]> => {
  const query = input.query.trim();
  if (query.length === 0) {
    return [];
  }

  const limit = input.limit ?? 5;
  const sources: SourceSnippet[] = [
    {
      id: "glossary:tradeoff",
      title: "Glossary",
      citation: "Glossary (local)",
      text: `Trade-off framing for: ${query}`,
    },
    {
      id: "method:operationalize",
      title: "Method",
      citation: "Method note (local)",
      text: `Operationalize claims and metrics for: ${query}`,
    },
    {
      id: "method:counterexample",
      title: "Method",
      citation: "Method note (local)",
      text: `Generate counterexamples and failure modes for: ${query}`,
    },
  ];

  return sources.slice(0, limit);
};
