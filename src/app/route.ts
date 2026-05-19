import { runDebate } from "@/lib/orchestrator/runDebate";
import { NextResponse } from "next/server";

// Importante: Vercel Hobby tiene un límite de 10s. 
// maxDuration intenta extenderlo (funciona mejor en planes Pro).
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, language, audience, context } = body;

    if (!question) {
      return NextResponse.json({ error: "La pregunta es obligatoria" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };

        try {
          // Llamamos al orquestador con el callback de progreso
          const result = await runDebate(
            { 
              question, 
              language: language || "es", 
              audience: audience || "undergraduate",
              context: context || ""
            },
            {
              onProgress: (update) => {
                send({ type: "progress", data: update });
              },
            }
          );

          // Enviamos el resultado final
          send({ type: "result", data: { result, recordId: null } });
        } catch (error: unknown) {
          console.error("Pipeline Error:", error);
          send({ type: "error", data: error instanceof Error ? error.message : "Error interno en el pipeline" });
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