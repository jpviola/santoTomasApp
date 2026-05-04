import type { Agent, DebateStage } from "@/lib/agents/types";

export type DebaterStance = "pro" | "con";

type CreateDebaterAgentOptions = {
  name: string;
  stage: Extract<DebateStage, "objections" | "sedContra">;
  stance: DebaterStance;
};

export const createDebaterAgent = (options: CreateDebaterAgentOptions): Agent => {
  return {
    name: options.name,
    stage: options.stage,
    async generate(ctx) {
      const q = ctx.input.question;
      const cueEs = options.stance === "pro" ? "A favor:" : "En contra:";
      const cueEn = options.stance === "pro" ? "In favor:" : "Against:";

      if (ctx.language === "es") {
        return `${cueEs} ${q}\nEnfoque: definir términos, explicitar supuestos y ofrecer un criterio de éxito.`;
      }

      return `${cueEn} ${q}\nApproach: define terms, surface assumptions, and propose a measurable success criterion.`;
    },
  };
};
