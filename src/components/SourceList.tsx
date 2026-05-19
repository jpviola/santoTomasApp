import type { SourceSnippet } from "@/types/debate";

type SourceListProps = {
  sources: SourceSnippet[];
  language?: "es" | "en";
};

export default function SourceList({ sources, language = "en" }: SourceListProps) {
  if (!sources.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        {language === "es" ? "No hay fuentes disponibles." : "No sources available."}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {sources.map((source, index) => (
        <li
          key={source.id}
          id={`source-${index + 1}`}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] font-mono text-[11px] text-[var(--muted-strong)]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5 text-[var(--foreground)]">{source.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">
                <span>{source.citation}</span>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="normal-case tracking-normal text-[var(--accent)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--accent)]"
                  >
                    {language === "es" ? "Abrir fuente" : "Open source"}
                  </a>
                ) : null}
              </div>
              <p className="mt-3 font-serif text-[15px] leading-7 text-[var(--muted-strong)]">{source.text}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
