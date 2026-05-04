export type DebateHistoryItem = {
  id: string;
  question: string;
  audience: string;
  context: string | null;
  createdAt: string;
  generatedAt: string;
};
