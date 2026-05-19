import { runDebate } from "@/lib/orchestrator/runDebate";
import { NextResponse } from "next/server";
import { saveDebate } from "@/lib/db/debates";
import { retrieveAquinasSources } from "@/lib/retrieval/aquinasRetriever";
import { parseDebateInput, type DebateInput, type DebateOutput } from "@/lib/schemas/debate";
import { isAppError, LlmProviderError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

// Importante: Vercel Hobby tiene un limite de 10s.
// maxDuration intenta extenderlo (funciona mejor en planes Pro).
export const maxDuration = 180;

async function buildLocalFallbackDebate(input: DebateInput): Promise<DebateOutput> {
  const sources = await retrieveAquinasSources(input.question, 3);
  const sourceLine = sources.length
    ? sources.map((source) => source.citation).join("; ")
    : "corpus local";

  if (input.language === "en") {
    return {
      question: input.question,
      objections: [
        "It seems that the question cannot be settled without a fuller metaphysical account.",
        "Further, a contemporary reader may object that the available sources do not exhaust the difficulty.",
        "Further, one might say that the conclusion requires more than textual authority.",
      ],
      sedContra: `On the contrary, the local Thomistic corpus offers relevant starting points: ${sourceLine}.`,
      respondeo:
        "I answer that, while the external LLM provider is currently unreachable, the question can still be approached by the scholastic method: distinguish the terms, identify the principle at stake, and read the supplied sources as authorities that orient rather than replace reasoning.",
      replies: [
        "To the first, a partial answer can still clarify the order of inquiry.",
        "To the second, limited sources should be treated as a disciplined beginning, not as an exhaustive apparatus.",
        "To the third, authority and argument work together in scholastic reasoning when each is kept in its proper role.",
      ],
      application:
        "This is a local fallback answer generated without the LLM provider. Check the configured provider connection to restore the full AI disputation.",
      sources,
      metadata: {
        audience: input.audience,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  if (input.language === "la") {
    return {
      question: input.question,
      objections: [
        "Videtur quod quaestio plenius determinari non possit sine ampliori distinctione terminorum.",
        "Praeterea, fontes praesentes difficultatem non totaliter exhauriunt.",
        "Praeterea, conclusio non debet sola auctoritate constitui.",
      ],
      sedContra: `Sed contra, corpus locale principia quaedam suppeditat: ${sourceLine}.`,
      respondeo:
        "Respondeo dicendum quod, provisore externo nunc non attingibili, quaestio tamen via scholastica tractari potest: distinguendo terminos, principium quaesitum inveniendo, et fontes datos ordinate legendo.",
      replies: [
        "Ad primum, etiam responsio localis ordinem inquisitionis manifestare potest.",
        "Ad secundum, fontes pauci initium disciplinatum praebent, non apparatum completum.",
        "Ad tertium, auctoritas et ratio simul operantur, servato ordine proprio.",
      ],
      application:
        "Haec est responsio subsidiaria localis sine provisore LLM. Connexionem provisoris configura ad disputationem plenam restituendam.",
      sources,
      metadata: {
        audience: input.audience,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  return {
    question: input.question,
    objections: [
      "Parece que la cuestión no puede resolverse sin una distinción metafísica más completa.",
      "Además, un lector contemporáneo podría objetar que las fuentes disponibles no agotan la dificultad.",
      "Además, podría decirse que la conclusión exige algo más que autoridad textual.",
    ],
    sedContra: `Por el contrario, el corpus tomista local ofrece puntos de partida relevantes: ${sourceLine}.`,
    respondeo:
      "Respondo que, aunque el proveedor LLM externo no está accesible en este momento, la cuestión todavía puede abordarse por el método escolástico: distinguir los términos, reconocer el principio en juego y leer las fuentes disponibles como autoridades que orientan la razón sin sustituirla.",
    replies: [
      "A la primera, una respuesta parcial puede aclarar el orden de la investigación.",
      "A la segunda, las fuentes limitadas deben tomarse como un comienzo disciplinado, no como un aparato exhaustivo.",
      "A la tercera, autoridad y argumento cooperan en la razón escolástica cuando cada uno conserva su función propia.",
    ],
    application:
      "Esta es una respuesta local de respaldo generada sin el proveedor LLM. Revisa la conexión o configuración del proveedor para restaurar la disputa AI completa.",
    sources,
    metadata: {
      audience: input.audience,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function persistDebate(input: DebateInput, result: DebateOutput) {
  return saveDebate({
    question: input.question,
    audience: input.audience,
    context: input.context,
    objections: result.objections,
    sedContra: result.sedContra,
    respondeo: result.respondeo,
    replies: result.replies,
    application: result.application,
    sources: result.sources,
    generatedAt: result.metadata.generatedAt,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseDebateInput(body);

    if (!parsed.question) {
      return NextResponse.json({ error: "La pregunta es obligatoria" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        };

        try {
          // Llamamos al orquestador con el callback de progreso.
          const result = await runDebate(parsed, {
            onProgress: (update) => {
              send({ type: "progress", data: update });
            },
          });

          const saved = await persistDebate(parsed, result);

          // Enviamos el resultado final.
          send({ type: "result", data: { result: { ...result, recordId: saved.id }, recordId: saved.id } });
        } catch (error: unknown) {
          logger.error("Pipeline Error", {
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorDetails: isAppError(error) ? error.details : undefined,
          });

          if (error instanceof LlmProviderError) {
            const fallback = await buildLocalFallbackDebate(parsed);
            const saved = await persistDebate(parsed, fallback);
            send({
              type: "result",
              data: {
                result: { ...fallback, recordId: saved.id },
                recordId: saved.id,
                degraded: true,
              },
            });
            return;
          }

          if (isAppError(error)) {
            send({
              type: "error",
              data: {
                message: error.message,
                code: error.code,
                retryable: error.retryable,
              },
            });
          } else {
            send({
              type: "error",
              data: {
                message: error instanceof Error ? error.message : "Error interno en el pipeline",
                code: "INTERNAL_SERVER_ERROR",
                retryable: false,
              },
            });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo iniciar el proceso" }, { status: 500 });
  }
}
