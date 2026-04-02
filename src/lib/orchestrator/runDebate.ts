import { runModerator } from "@/lib/agents/moderator";
import { runObjections } from "@/lib/agents/objections";
import { runSedContra } from "@/lib/agents/sedContra";
import { runRespondeo } from "@/lib/agents/respondeo";
import { runReplies } from "@/lib/agents/replies";
import { retrieveAquinasSources } from "@/lib/retrieval/aquinasRetriever";
import { DebateInputSchema, DebateOutputSchema } from "@/lib/schemas/debate";
import type { DebateInput, DebateOutput } from "@/lib/schemas/debate";
import { DebatePipelineError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type DebateProgressUpdate = {
  stage: "start" | "moderate_and_retrieve" | "objections_and_sed_contra" | "respondeo" | "replies" | "finalize" | "done";
  progress: number;
  message: string;
};

type RunDebateOptions = {
  onProgress?: (update: DebateProgressUpdate) => void | Promise<void>;
};

export async function runDebate(input: DebateInput, options?: RunDebateOptions): Promise<DebateOutput> {
  try {
    const parsedInput = DebateInputSchema.parse(input);
    await options?.onProgress?.({ stage: "start", progress: 2, message: "Starting pipeline" });

    logger.info("Starting debate pipeline", {
      question: parsedInput.question,
      audience: parsedInput.audience,
      language: parsedInput.language,
    });

    await options?.onProgress?.({ stage: "moderate_and_retrieve", progress: 12, message: "Moderating question and retrieving sources" });
    const [sourcesRaw, moderated] = await Promise.all([
      retrieveAquinasSources(parsedInput.question),
      runModerator({
        question: parsedInput.question,
        audience: parsedInput.audience,
        context: parsedInput.context,
        language: parsedInput.language,
      }),
    ]);

    const sources =
      parsedInput.language === "es"
        ? await (await import("@/lib/retrieval/aquinasRetriever")).localizeAquinasSources(sourcesRaw, "es")
        : sourcesRaw;

    await options?.onProgress?.({ stage: "objections_and_sed_contra", progress: 38, message: "Generating objections and sed contra" });
    const [objectionsResult, sedContraResult] = await Promise.all([
      runObjections({
        question: moderated.question,
        framing: moderated.framing,
        precisionNotes: moderated.precisionNotes,
        sources,
        language: parsedInput.language,
      }),
      runSedContra({
        question: moderated.question,
        sources,
        language: parsedInput.language,
      }),
    ]);

    await options?.onProgress?.({ stage: "respondeo", progress: 62, message: "Drafting respondeo and application" });
    const respondeoResult = await runRespondeo({
      question: moderated.question,
      framing: moderated.framing,
      precisionNotes: moderated.precisionNotes,
      objections: objectionsResult.objections,
      sedContra: sedContraResult.sedContra,
      sources,
      audience: parsedInput.audience,
      language: parsedInput.language,
    });

    await options?.onProgress?.({ stage: "replies", progress: 82, message: "Writing replies to objections" });
    const repliesResult = await runReplies({
      question: moderated.question,
      objections: objectionsResult.objections,
      respondeo: respondeoResult.respondeo,
      language: parsedInput.language,
    });

    await options?.onProgress?.({ stage: "finalize", progress: 94, message: "Finalizing structured output" });
    const result: DebateOutput = {
      question: moderated.question,
      objections: objectionsResult.objections,
      sedContra: sedContraResult.sedContra,
      respondeo: respondeoResult.respondeo,
      replies: repliesResult.replies,
      application: respondeoResult.application,
      sources,
      metadata: {
        audience: parsedInput.audience,
        generatedAt: new Date().toISOString(),
      },
    };

    logger.info("Debate pipeline completed successfully", {
      question: result.question,
      objectionsCount: result.objections.length,
      repliesCount: result.replies.length,
    });

    const parsedOutput = DebateOutputSchema.parse(result);
    await options?.onProgress?.({ stage: "done", progress: 100, message: "Completed" });
    return parsedOutput;
  } catch (error) {
    logger.error("Debate pipeline failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    throw error instanceof Error ? error : new DebatePipelineError("Debate pipeline execution failed.", { cause: String(error) });
  }
}
