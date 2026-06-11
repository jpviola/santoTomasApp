"use client";

import { useMemo, useState } from "react";
import type { DebateOutput } from "@/types/debate";
import SourceList from "@/components/SourceList";
import SpeechButton from "@/components/SpeechButton";
import ExportMarkdownButton from "@/components/ExportMarkdownButton";

type DebateOutputProps = {
  result: DebateOutput;
  language: "es" | "en";
  contentLanguage?: "es" | "en" | "la";
};

type ScholasticSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const displayLabel = copied ? "✓" : label;
  const ariaLabel = copied ? (label.includes("opiar") ? "Copiado" : "Copied") : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      aria-live="polite"
      aria-atomic="true"
      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
    >
      {displayLabel}
    </button>
  );
}

function ScholasticSection({ id, eyebrow, title, children }: ScholasticSectionProps) {
  return (
    <section 
      id={id} 
      className="scroll-mt-24 rounded-lg border border-[var(--border)]/50 bg-[var(--surface)]/30 p-6 pt-8 transition-all hover:border-[var(--border)]/80"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
            {eyebrow.split(" ").slice(0, 2).map(w => w[0]).join("")}
          </span>
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="mt-0.5 font-serif text-xl font-semibold leading-tight text-[var(--foreground)]">{title}</h2>
        </div>
      </div>
      <div className="reading-prose mt-5 space-y-4 text-[var(--muted-strong)]">{children}</div>
    </section>
  );
}

export default function DebateOutput({ result, language, contentLanguage }: DebateOutputProps) {
  const contentLang = contentLanguage ?? language;
  const [readerWidth, setReaderWidth] = useState<"focus" | "default" | "wide">("default");
  const [readerSize, setReaderSize] = useState<"compact" | "default" | "large">("default");

  const t =
    language === "es"
      ? {
          question: "Cuestión",
          objections: "Objeciones",
          sedContra: "Sed contra",
          respondeo: "Respondeo",
          replies: "Réplicas",
          application: "Aplicación",
          sources: "Fuentes",
          copied: "Copiar",
          listen: "Escuchar",
          document: "Disputa escolástica",
          sourceCount: "fuentes",
          focus: "Foco",
          default: "Normal",
          wide: "Amplio",
        }
      : {
          question: "Question",
          objections: "Objections",
          sedContra: "Sed contra",
          respondeo: "Respondeo",
          replies: "Replies",
          application: "Application",
          sources: "Sources",
          copied: "Copy",
          listen: "Listen",
          document: "Scholastic disputation",
          sourceCount: "sources",
          focus: "Focus",
          default: "Default",
          wide: "Wide",
        };

  const allText = useMemo(
    () =>
      [
        result.question,
        ...result.objections,
        result.sedContra,
        result.respondeo,
        ...result.replies,
        result.application,
      ].join("\n\n"),
    [result],
  );

  const widthClass =
    readerWidth === "focus" ? "max-w-[760px]" : readerWidth === "wide" ? "max-w-[1040px]" : "max-w-[900px]";
  const textClass =
    readerSize === "compact" ? "text-[16px]" : readerSize === "large" ? "text-[20px]" : "text-[18px]";

  return (
    <article>
      <div className={`mx-auto w-full ${widthClass}`}>
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <header className="border-b border-[var(--border)] px-5 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">{t.document}</p>
                <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
                  {result.question}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <SpeechButton text={allText} lang={contentLang} />
                <CopyButton text={allText} label={t.copied} />
                <ExportMarkdownButton recordId={result.recordId} language={language} />
                <div className="ml-2 flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-1">
                  {(["focus", "default", "wide"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setReaderWidth(option)}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition ${
                        readerWidth === option
                          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                      title={option === "focus" ? t.focus : option === "wide" ? t.wide : t.default}
                    >
                      {option === "focus" ? "◉" : option === "wide" ? "◎" : "○"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-1">
                  {(["compact", "default", "large"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setReaderSize(option)}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition ${
                        readerSize === option
                          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {option === "compact" ? "A-" : option === "large" ? "A+" : "A"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--accent)]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {contentLang.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--olive)]/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--olive)]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {result.sources.length} {t.sourceCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-strong)] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted-strong)]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(result.metadata.generatedAt).toLocaleDateString()}
              </span>
            </div>
          </header>

          <div className={`px-5 py-8 sm:px-8 ${textClass}`}>
            <ScholasticSection id="question" eyebrow="Quaestio" title={t.question}>
              <p>{result.question}</p>
            </ScholasticSection>

            <ScholasticSection id="objections" eyebrow="Videtur quod non" title={t.objections}>
              <ol className="space-y-4 pl-5">
                {result.objections.map((objection, index) => (
                  <li key={index} className="pl-2">
                    {objection}
                  </li>
                ))}
              </ol>
            </ScholasticSection>

            <ScholasticSection id="sed-contra" eyebrow="Sed contra" title={t.sedContra}>
              <blockquote className="border-l-2 border-[var(--accent)] pl-5 italic text-[var(--foreground)]">
                {result.sedContra}
              </blockquote>
            </ScholasticSection>

            <ScholasticSection id="respondeo" eyebrow="Respondeo dicendum" title={t.respondeo}>
              <p>{result.respondeo}</p>
            </ScholasticSection>

            <ScholasticSection id="replies" eyebrow="Ad primum" title={t.replies}>
              <ol className="space-y-4 pl-5">
                {result.replies.map((reply, index) => (
                  <li key={index} className="pl-2">
                    {reply}
                  </li>
                ))}
              </ol>
            </ScholasticSection>

            <ScholasticSection id="application" eyebrow="Applicatio" title={t.application}>
              <p>{result.application}</p>
            </ScholasticSection>

            <section id="sources" className="scroll-mt-24 border-t border-[var(--border)] pt-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">Apparatus</p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[var(--foreground)]">{t.sources}</h2>
                </div>
              </div>
              <SourceList sources={result.sources} language={language} />
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
