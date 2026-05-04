import type { Agent, DebateStage } from "@/lib/agents/types";

type CreateJudgeAgentOptions = {
  name?: string;
  stage: DebateStage;
};

export const createJudgeAgent = ({ name = "Judge", stage }: CreateJudgeAgentOptions): Agent => {
  return {
    name,
    stage,
    async generate(ctx) {
      const q = ctx.input.question;
      const guidanceEs = "Criterio: claridad, distinciones, objeciones fuertes y pasos verificables.";
      const guidanceEn = "Rubric: clarity, distinctions, strong objections, and testable next steps.";

      return ctx.language === "es"
        ? `Moderación sobre “${q}”: ${guidanceEs}`
        : `Moderation on “${q}”: ${guidanceEn}`;
    },
  };
};
