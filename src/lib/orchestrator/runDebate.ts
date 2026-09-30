import { getOntologyEngine } from "@/lib/agents/OntologyEngine";
import { runModerator } from "@/lib/agents/moderator";
import { runScholasticDebate } from "@/lib/agents/scholasticDebate";
import { retrieveSourcesForDebate } from "@/lib/retrieval/retrieveSources";
import { DebateInputSchema, DebateOutputSchema } from "@/lib/schemas/debate";
import type { DebateInput, DebateOutput } from "@/lib/schemas/debate";
import { DebatePipelineError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { runWithSpan } from "@/lib/tracing";

type DebateProgressUpdate = {
  stage: "start" | "moderate_and_retrieve" | "objections_and_sed_contra" | "respondeo" | "replies" | "finalize" | "done";
  progress: number;
  message: string;
};

type RunDebateOptions = {
  onProgress?: (update: DebateProgressUpdate) => void | Promise<void>;
};

export async function runDebate(input: DebateInput, options?: RunDebateOptions): Promise<DebateOutput> {
  const pipelineStartedAt = Date.now();
  const logStage = (stage: string, startedAt: number) => {
    logger.info("Debate pipeline stage completed", {
      stage,
      durationMs: Date.now() - startedAt,
    });
  };

  try {
    const parsedInput = DebateInputSchema.parse(input);
    await options?.onProgress?.({ stage: "start", progress: 2, message: "Starting pipeline" });

    logger.info("Starting debate pipeline", {
      question: parsedInput.question,
      audience: parsedInput.audience,
      language: parsedInput.language,
    });

    await options?.onProgress?.({ stage: "moderate_and_retrieve", progress: 12, message: "Moderating question and retrieving sources" });
    const retrievalStartedAt = Date.now();

    // El moderador va primero: sus palabras clave y los artículos que propone guían la búsqueda.
    const { relevantTerms, moderated, sources, concepts } = await runWithSpan("debate.moderate_retrieve", async () => {
      const relevantTerms = await getOntologyEngine().findRelevantTerms(parsedInput.question);
      const moderated = await runModerator({
        question: parsedInput.question,
        audience: parsedInput.audience,
        context: parsedInput.context,
        language: parsedInput.language,
        ontologyTerms: relevantTerms,
      });
      const { sources, concepts } = await retrieveSourcesForDebate({
        question: parsedInput.question,
        language: parsedInput.language,
        keywords: moderated.searchKeywords,
        candidateLoci: moderated.candidateLoci,
        ontologyTerms: relevantTerms,
      });
      return { relevantTerms, moderated, sources, concepts };
    });
    logStage("moderate_and_retrieve", retrievalStartedAt);
    logger.info("Sources retrieved", {
      proposedLoci: moderated.candidateLoci,
      sources: sources.map((s) => `${s.citation} [${s.kind ?? "summary"}]`),
    });

    await options?.onProgress?.({ stage: "objections_and_sed_contra", progress: 38, message: "Generating objections and sed contra" });
    const generationStartedAt = Date.now();

    const debateResult = await runWithSpan("debate.generate_article", async () =>
      runScholasticDebate({
        question: moderated.question,
        sources,
        audience: parsedInput.audience,
        context: parsedInput.context,
        framing: moderated.framing,
        precisionNotes: moderated.precisionNotes,
        ontologyTerms: [...concepts, ...relevantTerms.map((term) => `${term.name}: ${term.description}`)],
        language: parsedInput.language,
      }),
    );
    logStage("single_pass_generation", generationStartedAt);

    await options?.onProgress?.({ stage: "respondeo", progress: 78, message: "Drafting respondeo and replies" });

    await options?.onProgress?.({ stage: "finalize", progress: 94, message: "Finalizing structured output" });
    const result: DebateOutput = {
      question: moderated.question,
      objections: debateResult.objections,
      sedContra: debateResult.sedContra,
      respondeo: debateResult.respondeo,
      replies: debateResult.replies,
      application: debateResult.application,
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
      durationMs: Date.now() - pipelineStartedAt,
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
