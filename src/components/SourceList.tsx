import type { SourceSnippet } from "@/types/debate";

type SourceListProps = {
  sources: SourceSnippet[];
  language?: "es" | "en";
};

export default function SourceList({ sources, language = "en" }: SourceListProps) {
  if (!sources.length) {
    return (
      <p className="text-sm text-slate-500">
        {language === "es" ? "No hay fuentes disponibles." : "No sources available."}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {sources.map((source) => (
        <li key={source.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="font-medium text-slate-900">{source.title}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{source.citation}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{source.text}</p>
        </li>
      ))}
    </ul>
  );
}
