"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useDebateManager } from "@/app/useDebateManager";
import DebateForm from "@/components/DebateForm";
import DebateSidebar from "@/components/DebateSidebar";
import DebateOutput from "@/components/DebateOutput";
import LoadingState from "@/components/LoadingState";
import content from "@/data/content.json";
import { DebateOutput as DebateOutputType } from "@/types/debate";

interface ContentStructure {
  [key: string]: {
    suggested: string[];
  };
}

const typedContent = content as ContentStructure;

function isFallbackDebate(result: DebateOutputType | null) {
  if (!result) return false;
  return /proveedor LLM externo no est[aá] accesible|external LLM provider is currently unreachable|provisore externo/i.test(
    `${result.respondeo}\n${result.application}`,
  );
}

export default function HomePageClient() {
  const [language, setLanguage] = useState<"es" | "en">(() => {
    if (typeof window === "undefined") return "es";
    const stored = window.localStorage.getItem("stotomas.language");
    return stored === "en" ? "en" : "es";
  });

  const [answerLanguage, setAnswerLanguage] = useState<"es" | "en" | "la">(() => {
    if (typeof window === "undefined") return "es";
    const stored = window.localStorage.getItem("stotomas.answerLanguage");
    return stored === "en" || stored === "la" ? stored : "es";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    result,
    isRunningDebate,
    runError,
    historyItems,
    isHistoryLoading,
    activeTask,
    fetchHistory,
    fetchDebateById,
    formatTaskMessage,
    handleRunDebate,
    handleNewQuestion,
    setOutputLanguage,
    setResult,
  } = useDebateManager(language, answerLanguage);

  useEffect(() => {
    if (result && result.question && !isRunningDebate && !isFallbackDebate(result)) {
      const cacheKey = `st_cache_${answerLanguage}_${result.question.toLowerCase().trim()}`;
      if (!window.localStorage.getItem(cacheKey)) {
        window.localStorage.setItem(cacheKey, JSON.stringify(result));
      }
    }
  }, [result, isRunningDebate, answerLanguage]);

  const runDebateWithCache = useCallback(
    async (params: { question: string }, langOverride?: "es" | "en" | "la") => {
      const targetLang = langOverride || answerLanguage;
      const cacheKey = `st_cache_${targetLang}_${params.question.toLowerCase().trim()}`;
      const cached = window.localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const cachedResult = JSON.parse(cached) as DebateOutputType;
          if (!isFallbackDebate(cachedResult)) {
            setResult(cachedResult);
            return;
          }
        } catch {
          // Ignore malformed local cache and regenerate below.
        }
        window.localStorage.removeItem(cacheKey);
      }

      await handleRunDebate(params, langOverride);
    },
    [answerLanguage, handleRunDebate, setResult],
  );

  useEffect(() => {
    window.localStorage.setItem("stotomas.language", language);
    window.localStorage.setItem("stotomas.answerLanguage", answerLanguage);
  }, [language, answerLanguage]);

  useEffect(() => {
    if (!result) {
      setAnswerLanguage((current) => (current === "la" ? "la" : language));
    }
  }, [language, result]);

  const switchAnswerLanguage = useCallback(
    (newLang: "es" | "en" | "la") => {
      setAnswerLanguage(newLang);
      if (result && result.question && !isRunningDebate) {
        setOutputLanguage(newLang);
        runDebateWithCache({ question: result.question }, newLang);
      }
    },
    [result, isRunningDebate, setOutputLanguage, runDebateWithCache],
  );

  const suggested = useMemo(() => typedContent[language]?.suggested || [], [language]);

  const toggleUILanguage = useCallback(() => {
    setLanguage((v) => (v === "es" ? "en" : "es"));
  }, []);

  const t =
    language === "es"
      ? {
          menu: "Abrir biblioteca",
          title: "Santo Tomas App",
          subtitle: "Disputa con Santo Tomas",
          suggested: "Cuestiones sugeridas",
          newQuestion: "Nueva cuestion",
          answerLanguage: "Idioma de respuesta",
          interfaceLanguage: "Interfaz",
          error: "Error",
          emptyTitle: "Santo Tomas de Aquino",
          emptyCopy: "Formula una cuestion y recibe una disputa organizada con objeciones, sed contra, respondeo, replicas y fuentes.",
        }
      : {
          menu: "Open library",
          title: "Santo Tomas App",
          subtitle: "Debate with St. Thomas",
          suggested: "Suggested questions",
          newQuestion: "New question",
          answerLanguage: "Answer language",
          interfaceLanguage: "Interface",
          error: "Error",
          emptyTitle: "Thomas Aquinas",
          emptyCopy: "Ask a question and receive a structured disputation with objections, sed contra, respondeo, replies, and sources.",
        };

  return (
    <main id="main-content" className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <DebateSidebar
        items={historyItems}
        isLoading={isHistoryLoading}
        onSelect={fetchDebateById}
        onRefresh={fetchHistory}
        language={language}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[64px] items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label={t.menu}
              aria-expanded={sidebarOpen}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] lg:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h7a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
              <Image
                src="/aquinas-banner.webp"
                alt={language === "es" ? "Santo Tomas" : "Thomas Aquinas"}
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg font-semibold leading-5 text-[var(--foreground)]">{t.title}</h1>
              <p className="hidden truncate text-xs text-[var(--muted)] sm:block">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
              {(["la", "es", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => switchAnswerLanguage(lang)}
                  aria-label={`${t.answerLanguage}: ${lang}`}
                  className={`rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition ${
                    answerLanguage === lang
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {lang === "la" ? "LAT" : lang}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleUILanguage}
              aria-label={t.interfaceLanguage}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
            >
              {language === "es" ? "ES" : "EN"}
            </button>
          </div>
        </header>

        <div className="scholarly-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {isRunningDebate && activeTask && (
              <div className="mx-auto mb-5 max-w-3xl">
                <LoadingState
                  language={language}
                  progress={activeTask.progress}
                  message={formatTaskMessage(activeTask.message ?? null)}
                />
              </div>
            )}

            {runError && (
              <div className="mx-auto mb-5 max-w-3xl rounded-[10px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
                <span className="font-semibold">{t.error}: </span>
                {runError}
              </div>
            )}

            {result && (
              <div className="pb-7">
                <DebateOutput result={result} language={language} contentLanguage={answerLanguage} />
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleNewQuestion}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--muted-strong)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  >
                    {t.newQuestion}
                  </button>
                </div>
              </div>
            )}

            {!result && !isRunningDebate && (
              <div className="mx-auto max-w-4xl space-y-8 pb-7">
                <section className="grid gap-5 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:grid-cols-[160px_minmax(0,1fr)] sm:p-7">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)]">
                    <Image
                      src="/aquinas-banner.webp"
                      alt={t.emptyTitle}
                      fill
                      sizes="(max-width: 640px) 100vw, 160px"
                      className="object-cover object-[18%_50%]"
                      priority
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">Quaestio</p>
                    <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
                      {t.emptyTitle}
                    </h2>
                    <p className="mt-4 max-w-2xl font-serif text-lg leading-8 text-[var(--muted-strong)]">{t.emptyCopy}</p>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{t.suggested}</h3>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggested.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => runDebateWithCache({ question: q })}
                        className="min-h-[88px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left font-serif text-[16px] leading-6 text-[var(--muted-strong)] shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] p-3 backdrop-blur sm:p-4">
          <div className="mx-auto max-w-3xl">
            <DebateForm onSubmit={runDebateWithCache} isLoading={isRunningDebate} language={language} />
          </div>
        </div>
      </div>

    </main>
  );
}
