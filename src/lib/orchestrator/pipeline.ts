import { runModerator } from "@/lib/agents/moderator";
import { runObjections } from "@/lib/agents/objections";
import { runSedContra } from "@/lib/agents/sedContra";
import { runRespondeo } from "@/lib/agents/respondeo";
import { runReplies } from "@/lib/agents/replies";
import { retrieveAquinasSources } from "@/lib/retrieval/aquinasRetriever";

export type DebatePipeline = {
  retrieveSources: typeof retrieveAquinasSources;
  runModerator: typeof runModerator;
  runObjections: typeof runObjections;
  runSedContra: typeof runSedContra;
  runRespondeo: typeof runRespondeo;
  runReplies: typeof runReplies;
};

export const createDebatePipeline = (): DebatePipeline => {
  return {
    retrieveSources: retrieveAquinasSources,
    runModerator,
    runObjections,
    runSedContra,
    runRespondeo,
    runReplies,
  };
};
