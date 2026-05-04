import type { DebateInput, DebateOutput, SourceSnippet } from "@/lib/schemas/debate";

export type DebateLanguage = "en" | "es";

export type DebateStage = "moderator" | "objections" | "sedContra" | "respondeo" | "replies" | "application";

export type AgentContext = {
  input: DebateInput;
  language: DebateLanguage;
  sources: SourceSnippet[];
  state: Partial<DebateOutput>;
};

export type Agent = {
  name: string;
  stage: DebateStage;
  generate: (ctx: AgentContext) => Promise<unknown>;
};
