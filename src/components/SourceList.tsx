import type { SourceSnippet } from "@/types/debate";

type SourceListProps = {
  sources: SourceSnippet[];
  language?: "es" | "en";
};

export default function SourceList({ sources, language = "en" }: SourceListProps) {
  if (!sources.length) {
    return (
      <p className="text-sm text-slate-300/70">
        {language === "es" ? "No hay fuentes disponibles." : "No sources available."}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {sources.map((source) => (
        <li key={source.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="font-medium text-slate-100">{source.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-wide text-slate-300/70">
            <span>{source.citation}</span>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="normal-case tracking-normal text-slate-200/80 underline decoration-white/20 underline-offset-4 hover:text-slate-100 hover:decoration-white/40"
              >
                {language === "es" ? "Abrir" : "Open"}
              </a>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-200/90">{source.text}</p>
        </li>
      ))}
    </ul>
  );
}
