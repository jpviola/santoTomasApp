export type RetrievalRequest = {
  question: string;
  query?: string;
  limit?: number;
};

export type Retriever = {
  retrieve: (request: RetrievalRequest) => Promise<import("@/lib/schemas/debate").SourceSnippet[]>;
};

export const createStaticRetriever = (): Retriever => {
  return {
    async retrieve(request) {
      const limit = request.limit ?? 5;
      const query = (request.query ?? request.question).trim();

      if (query.length === 0) {
        return [];
      }

      const sources: import("@/lib/schemas/debate").SourceSnippet[] = [
        {
          id: "static:topic",
          title: "Topic",
          citation: "Static Retriever",
          text: request.question,
        },
        {
          id: "static:focus",
          title: "Focus",
          citation: "Static Retriever",
          text: query,
        },
        {
          id: "static:guidelines",
          title: "Guidelines",
          citation: "Static Retriever",
          text: "Prefer concrete claims, define terms, and consider trade-offs. Separate assumptions, evidence, and value judgments. When uncertain, propose experiments or measurements.",
        },
      ];

      return sources.slice(0, limit);
    },
  };
};
