"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useDebateManager } from "@/app/useDebateManager";
import DebateForm from "@/components/DebateForm";
import DebateSidebar from "@/components/DebateSidebar";
import DebateOutput from "@/components/DebateOutput";
import DebateProgressBar from "@/components/DebateProgressBar";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import BuyMeACoffeeButton from "@/components/BuyMeACoffeeButton";
import content from "@/data/content.json";
import { DebateOutput as DebateOutputType } from "@/types/debate";

interface ContentStructure {
  [key: string]: {
    suggested: string[];
  };
}

const typedContent = content as ContentStructure;
const SUGGESTED_COUNT = 3;

function isFallbackDebate(result: DebateOutputType | null) {
  if (!result) return false;
  return /proveedor LLM externo no est[aá] accesible|external LLM provider is currently unreachable|provisore externo/i.test(
    `${result.respondeo}\n${result.application}`,
  );
}

function rotateSuggested(items: string[], seed: number) {
  if (items.length <= SUGGESTED_COUNT) return items;
  return Array.from({ length: SUGGESTED_COUNT }, (_, index) => items[(seed + index) % items.length]);
}

export default function HomePageClient() {
  const [suggestedSeed, setSuggestedSeed] = useState(0);

  const [language, setLanguage] = useState<"es" | "en">("es");
  const [answerLanguage, setAnswerLanguage] = useState<"es" | "en" | "la">("es");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSuggestedSeed(Math.floor(Math.random() * 1000));
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarOpen(true);
    }
    const storedLang = window.localStorage.getItem("stotomas.language");
    if (storedLang === "en") setLanguage("en");
    const storedAnswerLang = window.localStorage.getItem("stotomas.answerLanguage");
    if (storedAnswerLang === "en" || storedAnswerLang === "la") setAnswerLanguage(storedAnswerLang);
  }, []);

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

  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const getCachedDebate = useCallback((cacheKey: string): DebateOutputType | null => {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw) as { data?: DebateOutputType; cachedAt?: number };
      if (!entry.data || !entry.cachedAt) return null;
      if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        window.localStorage.removeItem(cacheKey);
        return null;
      }
      return entry.data;
    } catch {
      window.localStorage.removeItem(cacheKey);
      return null;
    }
  }, [CACHE_TTL_MS]);

  const setCachedDebate = useCallback((cacheKey: string, data: DebateOutputType) => {
    const entry = { data, cachedAt: Date.now() };
    window.localStorage.setItem(cacheKey, JSON.stringify(entry));
  }, []);

  useEffect(() => {
    if (result && result.question && !isRunningDebate && !isFallbackDebate(result)) {
      const cacheKey = `st_cache_${answerLanguage}_${result.question.toLowerCase().trim()}`;
      if (!getCachedDebate(cacheKey)) {
        setCachedDebate(cacheKey, result);
      }
    }
  }, [result, isRunningDebate, answerLanguage, getCachedDebate, setCachedDebate]);

  const runDebateWithCache = useCallback(
    async (params: { question: string; context?: string }, langOverride?: "es" | "en" | "la") => {
      const targetLang = langOverride || answerLanguage;
      const cacheKey = `st_cache_${targetLang}_${params.question.toLowerCase().trim()}`;
      const cachedResult = getCachedDebate(cacheKey);

      if (cachedResult) {
        setResult(cachedResult);
        return;
      }

      await handleRunDebate(params, langOverride);
      setSuggestedSeed((seed) => seed + 1);
    },
    [answerLanguage, getCachedDebate, handleRunDebate, setResult],
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

  const suggested = useMemo(
    () => rotateSuggested(typedContent[language]?.suggested || [], suggestedSeed),
    [language, suggestedSeed],
  );

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
          answerLabel: "Respuesta",
          interfaceLanguage: "Cambiar idioma de la interfaz",
          interfaceLabel: "Interfaz",
          error: "Error",
          emptyTitle: "Santo Tomas de Aquino",
          emptyCopy: "Formula una cuestion y recibe una disputa organizada con objeciones, sed contra, respondeo, replicas y fuentes.",
          footer: "hecho con",
          footerBy: "por",
        }
      : {
          menu: "Open library",
          title: "Santo Tomas App",
          subtitle: "Debate with St. Thomas",
          suggested: "Suggested questions",
          newQuestion: "New question",
          answerLanguage: "Answer language",
          answerLabel: "Answer",
          interfaceLanguage: "Switch interface language",
          interfaceLabel: "Interface",
          error: "Error",
          emptyTitle: "Thomas Aquinas",
          emptyCopy: "Ask a question and receive a structured disputation with objections, sed contra, respondeo, replies, and sources.",
          footer: "made with",
          footerBy: "by",
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
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={t.menu}
              aria-expanded={sidebarOpen}
              aria-controls="debate-sidebar"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
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

          <div className="flex items-end gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">
                {t.answerLabel}
              </span>
              <div
                className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"
                title={t.answerLanguage}
                role="group"
                aria-label={t.answerLanguage}
              >
                {(["la", "es", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => switchAnswerLanguage(lang)}
                    aria-label={`${t.answerLanguage}: ${lang === "la" ? "Latín" : lang === "es" ? "Español" : "English"}`}
                    aria-pressed={answerLanguage === lang}
                    className={`rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition ${
                      answerLanguage === lang
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {lang === "la" ? "LAT" : lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <BuyMeACoffeeButton />
            <div className="flex flex-col items-center gap-1">
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">
                {t.interfaceLabel}
              </span>
              <button
                type="button"
                onClick={toggleUILanguage}
                aria-label={t.interfaceLanguage}
                title={t.interfaceLanguage}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
              >
                {language === "es" ? "ES" : "EN"}
              </button>
            </div>
          </div>
        </header>

        {isRunningDebate && activeTask && (
          <DebateProgressBar
            progress={activeTask.progress}
            message={formatTaskMessage(activeTask.message ?? null) ?? ""}
            language={language}
          />
        )}

        <div className="scholarly-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-5 lg:px-7">
          <div className="mx-auto max-w-6xl">
            {isRunningDebate && activeTask && (
              <div className="mx-auto mb-5 max-w-3xl" role="status" aria-live="polite" aria-label={formatTaskMessage(activeTask.message ?? null) ?? undefined}>
                <LoadingState
                  language={language}
                  progress={activeTask.progress}
                  message={formatTaskMessage(activeTask.message ?? null)}
                />
              </div>
            )}

            {runError && (
              <div role="alert" className="mx-auto mb-5 max-w-3xl rounded-[10px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
                <span className="font-semibold">{t.error}: </span>
                {runError}
              </div>
            )}

            {result && (
              <div className="pb-5">
                <DebateOutput result={result} language={language} contentLanguage={answerLanguage} />
                <div className="mt-4 flex justify-center">
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
              <div className="mx-auto max-w-4xl space-y-3 pb-2">
                <section className="grid gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)] sm:grid-cols-[96px_minmax(0,1fr)] sm:p-4">
                  <div className="relative aspect-[3/1] overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] sm:aspect-[4/5]">
                    <Image
                      src="/aquinas-banner.webp"
                      alt={t.emptyTitle}
                      fill
                      sizes="(max-width: 640px) 100vw, 110px"
                      className="object-cover object-[18%_50%]"
                      priority
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Quaestio</p>
                    <h2 className="mt-1 font-serif text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">
                      {t.emptyTitle}
                    </h2>
                    <p className="mt-2 line-clamp-3 font-serif text-[14px] leading-[1.55] text-[var(--muted-strong)]">{t.emptyCopy}</p>
                  </div>
                </section>

                <section>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{t.suggested}</h3>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {suggested.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => runDebateWithCache({ question: q })}
                        aria-label={q}
                        className="min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-2.5 text-left font-serif text-[13px] leading-[1.5] text-[var(--muted-strong)] shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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

        <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] p-2 backdrop-blur sm:p-3">
          <div className="mx-auto max-w-3xl">
            <DebateForm onSubmit={runDebateWithCache} isLoading={isRunningDebate} language={language} />
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] px-4 py-6 text-xs text-[var(--muted)] backdrop-blur sm:flex-row sm:px-5">
          <div className="flex items-center gap-4">
            <p className="flex items-center gap-1.5">
              <span>{t.footer}</span>
              <span aria-hidden="true" className="text-[var(--accent)]">♥</span>
              <span>{t.footerBy}</span>
              <a
                href="https://www.jpviola.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--muted-strong)] underline decoration-transparent underline-offset-4 transition hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
              >
                jpviola
              </a>
            </p>
            <span className="hidden text-[var(--border)] sm:inline">•</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-wider text-[var(--surface-strong)] sm:inline">
              v0.1
            </span>
          </div>
          <nav aria-label={language === "es" ? "Redes sociales" : "Social networks"} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <a href="https://www.linkedin.com/in/jpviola/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://www.github.com/jpviola" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/jpviola2" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </nav>
        </footer>
      </div>

    </main>
  );
}
