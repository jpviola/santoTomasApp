"use client";

import { useMemo, useState } from "react";
import type { DebateOutput } from "@/types/debate";
import SourceList from "@/components/SourceList";
import SpeechButton from "@/components/SpeechButton";

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
    <section id={id} className="scroll-mt-24 border-t border-[var(--border)] pt-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[var(--foreground)]">{title}</h2>
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
          reading: "Lectura",
          width: "Ancho",
          type: "Tipo",
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
          reading: "Reading",
          width: "Width",
          type: "Type",
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
    readerWidth === "focus" ? "max-w-[680px]" : readerWidth === "wide" ? "max-w-[920px]" : "max-w-[780px]";
  const textClass =
    readerSize === "compact" ? "text-[16px]" : readerSize === "large" ? "text-[20px]" : "text-[18px]";

  const sections = [
    { id: "question", label: t.question },
    { id: "objections", label: t.objections },
    { id: "sed-contra", label: t.sedContra },
    { id: "respondeo", label: t.respondeo },
    { id: "replies", label: t.replies },
    { id: "application", label: t.application },
    { id: "sources", label: t.sources },
  ];

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
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
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 font-mono uppercase tracking-[0.08em]">
                {contentLang}
              </span>
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1">
                {result.sources.length} {t.sourceCount}
              </span>
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1">
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

      <aside className="hidden lg:block">
        <div className="sticky top-5 space-y-4">
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{t.reading}</p>
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--muted)]">{t.width}</p>
                <div className="grid grid-cols-3 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-1">
                  {(["focus", "default", "wide"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setReaderWidth(option)}
                      className={`rounded px-2 py-1 text-xs transition ${
                        readerWidth === option
                          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {option === "focus" ? t.focus : option === "wide" ? t.wide : t.default}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--muted)]">{t.type}</p>
                <div className="grid grid-cols-3 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-1">
                  {(["compact", "default", "large"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setReaderSize(option)}
                      className={`rounded px-2 py-1 text-xs transition ${
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
          </div>

          <nav className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Index</p>
            <div className="space-y-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1.5 text-sm text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </aside>
    </article>
  );
}
