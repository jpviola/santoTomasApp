"use client";

import { useEffect, useState } from "react";
import type { SourceSnippet } from "@/lib/schemas/debate";
import type { PrimaryText } from "@/lib/learning/types";

type PrimaryTextCardProps = {
  primaryText: PrimaryText;
  language: "es" | "en";
};

type LoadState = { status: "loading" } | { status: "ready"; source: SourceSnippet } | { status: "error" };

export default function PrimaryTextCard({ primaryText, language }: PrimaryTextCardProps) {
  const [textLanguage, setTextLanguage] = useState<"es" | "en" | "la">(language);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    setTextLanguage(language);
  }, [language, primaryText.sourceId]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(`/api/learn/source/${encodeURIComponent(primaryText.sourceId)}?language=${textLanguage}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { source: SourceSnippet }) => setState({ status: "ready", source: data.source }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [primaryText.sourceId, textLanguage]);

  const t =
    language === "es"
      ? { error: "No se pudo cargar el texto ahora.", open: "Leer el artículo completo", text: "Texto de Tomás", summary: "Resumen", latin: "Latín" }
      : { error: "The text could not be loaded right now.", open: "Read the full article", text: "Aquinas's text", summary: "Summary", latin: "Latin" };

  const options: ("es" | "en" | "la")[] = [language, "la"];

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]">
            {state.status === "ready" ? state.source.citation : "…"}
          </p>
          {state.status === "ready" && (
            <p className="mt-1 font-serif text-[16px] font-semibold leading-snug text-[var(--foreground)]">{state.source.title}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-0.5" role="group">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTextLanguage(option)}
              aria-pressed={textLanguage === option}
              className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase transition ${
                textLanguage === option ? "bg-[var(--surface)] font-semibold text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {option === "la" ? t.latin : option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted-strong)]">{primaryText.why}</p>

      {primaryText.latin && (
        <p className="mt-3 border-l-2 border-[var(--accent)] pl-3 font-serif text-[17px] italic text-[var(--foreground)]">{primaryText.latin}</p>
      )}

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        {state.status === "loading" && (
          <div className="space-y-2" aria-busy="true">
            {["100%", "96%", "88%", "70%"].map((width) => (
              <div key={width} className="h-3 animate-pulse rounded bg-[var(--surface-strong)]" style={{ width }} />
            ))}
          </div>
        )}
        {state.status === "error" && <p className="text-sm text-[var(--muted)]">{t.error}</p>}
        {state.status === "ready" && (
          <>
            <span
              className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                state.source.kind === "text" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-strong)] text-[var(--muted-strong)]"
              }`}
            >
              {state.source.kind === "text" ? t.text : t.summary}
            </span>
            <p className="mt-2 whitespace-pre-line font-serif text-[16px] leading-[1.75] text-[var(--foreground)]">{state.source.text}</p>
            {state.source.url && (
              <a
                href={state.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-[var(--accent)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--accent)]"
              >
                {t.open}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
