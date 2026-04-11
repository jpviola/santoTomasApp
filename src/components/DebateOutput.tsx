import type { DebateOutput } from "@/types/debate";
import SourceList from "@/components/SourceList";
import ExportMetadataPanel from "@/components/ExportMetadataPanel";
import SpeechButton from "@/components/SpeechButton";

type DebateOutputProps = {
  result: DebateOutput;
  language?: "es" | "en";
  contentLanguage?: "es" | "en" | "la";
};

export default function DebateOutput({ result, language = "en", contentLanguage }: DebateOutputProps) {
  const contentLang = contentLanguage ?? language;
  const t =
    language === "es"
      ? {
          title: "Chat escolástico",
          subtitle: "Una disputa estructurada (objeciones, sed contra, respondeo, réplicas, aplicación y fuentes).",
          question: "Pregunta",
          loadedRecord: "Registro cargado",
          audience: "Audiencia",
          generated: "Generado",
          objections: "Objeciones",
          sedContra: "Sed contra",
          respondeo: "Respondeo",
          replies: "Réplicas a las objeciones",
          application: "Aplicación contemporánea",
          sources: "Fuentes",
        }
      : {
          title: "Scholastic Chat",
          subtitle: "A structured disputation (objections, sed contra, respondeo, replies, application, and sources).",
          question: "Question",
          loadedRecord: "Loaded record",
          audience: "Audience",
          generated: "Generated",
          objections: "Objections",
          sedContra: "Sed Contra",
          respondeo: "Respondeo",
          replies: "Replies to Objections",
          application: "Contemporary Application",
          sources: "Sources",
        };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-100">{t.title}</h2>
          <p className="mt-1 text-sm text-slate-300/70">{t.subtitle}</p>
          <div className="mt-2 text-xs uppercase tracking-wide text-slate-300/60">
            {t.audience}: {result.metadata.audience} · {t.generated}: {new Date(result.metadata.generatedAt).toLocaleString()}
          </div>
          {result.recordId ? (
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-300/60">
              {t.loadedRecord}: {result.recordId}
            </div>
          ) : null}
        </div>
      </div>

      <ExportMetadataPanel recordId={result.recordId ?? null} language={language} />

      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/20 via-white/5 to-blue-500/20 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.question}</div>
              <SpeechButton text={result.question} lang={contentLang} />
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-100">{result.question}</p>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.objections}</div>
              <SpeechButton text={result.objections.join("\n")} lang={contentLang} />
            </div>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-200/90">
              {result.objections.map((objection, index) => (
                <li key={index}>{objection}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.sedContra}</div>
              <SpeechButton text={result.sedContra} lang={contentLang} />
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-200/90">{result.sedContra}</p>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.respondeo}</div>
              <SpeechButton text={result.respondeo} lang={contentLang} />
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-200/90">{result.respondeo}</p>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.replies}</div>
              <SpeechButton text={result.replies.join("\n")} lang={contentLang} />
            </div>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-200/90">
              {result.replies.map((reply, index) => (
                <li key={index}>{reply}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.application}</div>
              <SpeechButton text={result.application} lang={contentLang} />
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-200/90">{result.application}</p>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.sources}</div>
            <div className="mt-3">
              <SourceList sources={result.sources} language={language} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
