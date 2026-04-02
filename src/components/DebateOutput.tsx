import type { DebateOutput } from "@/types/debate";
import SectionCard from "@/components/SectionCard";
import SourceList from "@/components/SourceList";
import ExportMetadataPanel from "@/components/ExportMetadataPanel";

type DebateOutputProps = {
  result: DebateOutput;
  language?: "es" | "en";
};

export default function DebateOutput({ result, language = "en" }: DebateOutputProps) {
  const t =
    language === "es"
      ? {
          title: "Resultado del debate",
          subtitle: "Disputa escolástica estructurada con apoyo de fuentes.",
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
          title: "Debate Output",
          subtitle: "Structured scholastic disputation with source grounding.",
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
          <h2 className="text-xl font-semibold text-slate-950">{t.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
        </div>
      </div>

      <ExportMetadataPanel recordId={result.recordId ?? null} language={language} />

      <SectionCard title={t.question}>
        <p>{result.question}</p>
        {result.recordId ? (
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {t.loadedRecord}: {result.recordId}
          </div>
        ) : null}
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {t.audience}: {result.metadata.audience} · {t.generated}: {new Date(result.metadata.generatedAt).toLocaleString()}
        </div>
      </SectionCard>

      <SectionCard title={t.objections}>
        <ol className="list-decimal space-y-3 pl-5">
          {result.objections.map((objection, index) => (
            <li key={index}>{objection}</li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title={t.sedContra}>
        <p>{result.sedContra}</p>
      </SectionCard>

      <SectionCard title={t.respondeo}>
        <p>{result.respondeo}</p>
      </SectionCard>

      <SectionCard title={t.replies}>
        <ol className="list-decimal space-y-3 pl-5">
          {result.replies.map((reply, index) => (
            <li key={index}>{reply}</li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title={t.application}>
        <p>{result.application}</p>
      </SectionCard>

      <SectionCard title={t.sources}>
        <SourceList sources={result.sources} language={language} />
      </SectionCard>
    </div>
  );
}
