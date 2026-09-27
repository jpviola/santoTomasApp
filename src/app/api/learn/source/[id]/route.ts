import { NextResponse } from "next/server";
import { getCorpusEntry, hydrateAquinasSources, toSnippet } from "@/lib/retrieval/aquinasRetriever";
import { checkRateLimit, getClientKey, RATE_LIMITS } from "@/lib/rate-limit";

/** Texto real (o resumen) de un pasaje del corpus en el idioma pedido, para las lecciones. */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const rateCheck = await checkRateLimit(getClientKey(req, "learnSource"), RATE_LIMITS.learnSource);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests.", code: "RATE_LIMITED" }, { status: 429 });
  }

  const { id } = await context.params;
  const entry = getCorpusEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Source not found.", code: "SOURCE_NOT_FOUND" }, { status: 404 });
  }

  const language = new URL(req.url).searchParams.get("language");
  const target = language === "en" || language === "la" ? language : "es";

  const [source] = await hydrateAquinasSources([toSnippet(entry)], target);
  return NextResponse.json(
    { source: source ?? toSnippet(entry) },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
