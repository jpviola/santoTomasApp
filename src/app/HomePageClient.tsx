"use client";

import { useState, useEffect } from "react";
import { useDebateManager } from "@/app/useDebateManager";
import DebateForm from "@/components/DebateForm";
import DebateSidebar from "@/components/DebateSidebar";
import DebateOutput from "@/components/DebateOutput";
import LoadingState from "@/components/LoadingState";

const SUGGESTED_QUESTIONS_ES = [
  "¿Puede la inteligencia artificial entender verdaderamente?",
  "¿Existe Dios? Demuéstralo con cinco vías.",
  "¿El alma humana es inmortal?",
  "¿Qué es la verdad según Tomás de Aquino?",
];

const SUGGESTED_QUESTIONS_EN = [
  "Can artificial intelligence truly understand?",
  "Does God exist? Demonstrate via the five ways.",
  "Is the human soul immortal?",
  "What is truth according to Thomas Aquinas?",
];

export default function HomePageClient() {
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [answerLanguage, setAnswerLanguage] = useState<"es" | "en" | "la">("es");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedLang = window.localStorage.getItem("stotomas.language") as "es" | "en" | null;
    const storedAns = window.localStorage.getItem("stotomas.answerLanguage") as "es" | "en" | "la" | null;
    if (storedLang === "es" || storedLang === "en") setLanguage(storedLang);
    if (storedAns === "es" || storedAns === "en" || storedAns === "la") setAnswerLanguage(storedAns);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("stotomas.language", language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem("stotomas.answerLanguage", answerLanguage);
  }, [answerLanguage]);

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
  } = useDebateManager(language, answerLanguage);

  useEffect(() => {
    if (!result) {
      setAnswerLanguage((current) => (current === "la" ? "la" : language));
    }
  }, [language, result]);

  const suggested = language === "es" ? SUGGESTED_QUESTIONS_ES : SUGGESTED_QUESTIONS_EN;

  const switchAnswerLanguage = (newLang: "es" | "en" | "la") => {
    setAnswerLanguage(newLang);
    if (result && result.question && !isRunningDebate) {
      setOutputLanguage(newLang);
      handleRunDebate({ question: result.question }, newLang);
    }
  };

  const toggleUILanguage = () => {
    setLanguage((v) => (v === "es" ? "en" : "es"));
  };

  return (
    <main id="main-content" className="relative flex h-screen overflow-hidden">
      {/* Sidebar */}
      <DebateSidebar
        items={historyItems}
        isLoading={isHistoryLoading}
        onSelect={fetchDebateById}
        onRefresh={fetchHistory}
        language={language}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-white/10 bg-blue-950/30 px-4 py-2.5 backdrop-blur">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 overflow-hidden rounded-lg border border-white/20">
              <img
                src="/aquinas-banner.webp"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-sm font-medium text-slate-300">
              {language === "es" ? "Disputa con Santo Tomás" : "Debate with St. Thomas"}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => switchAnswerLanguage("la")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                answerLanguage === "la"
                  ? "bg-blue-500/25 text-blue-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              LAT
            </button>
            <button
              type="button"
              onClick={() => switchAnswerLanguage("es")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                answerLanguage === "es"
                  ? "bg-blue-500/25 text-blue-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => switchAnswerLanguage("en")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                answerLanguage === "en"
                  ? "bg-blue-500/25 text-blue-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              EN
            </button>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button
              type="button"
              onClick={toggleUILanguage}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              {language === "es" ? "ES" : "EN"}
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            {/* Loading state */}
            {isRunningDebate && activeTask && (
              <div className="mb-4">
                <LoadingState
                  language={language}
                  progress={activeTask.progress}
                  message={formatTaskMessage(activeTask.message ?? null)}
                />
              </div>
            )}

            {/* Error */}
            {runError && (
              <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
                {runError}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mb-4">
                <DebateOutput result={result} language={language} contentLanguage={answerLanguage} />
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleNewQuestion}
                    className="flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-2.5 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    {language === "es" ? "Nueva pregunta" : "New question"}
                  </button>
                </div>
              </div>
            )}

            {/* Welcome / suggested questions */}
            {!result && !isRunningDebate && (
              <div className="space-y-6">
                {/* Hero section */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="relative z-10 flex gap-6 px-6 py-6 sm:px-8 sm:py-8">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:h-36 sm:w-36">
                      <img
                        src="/aquinas-banner.webp"
                        alt="Santo Tomás de Aquino"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h2 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                        {language === "es" ? "Santo Tomás de Aquino" : "Thomas Aquinas"}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {language === "es"
                          ? "Explora las grandes cuestiones de la fe, la razón y la existencia mediante el método escolástico de disputación. Formula tu pregunta y recibe una respuesta al estilo de la Summa Theologiae."
                          : "Explore the great questions of faith, reason, and existence through the scholastic method of disputation. Get a response in the style of the Summa Theologiae."}
                      </p>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
                </div>

                {/* Suggested questions */}
                <div>
                  <h3 className="mb-3 text-center text-sm font-medium uppercase tracking-wider text-slate-400">
                    {language === "es" ? "Preguntas sugeridas" : "Suggested questions"}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggested.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleRunDebate({ question: q })}
                        className="line-clamp-2 rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-slate-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat bar */}
        <div className="border-t border-white/10 bg-blue-950/40 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <DebateForm onSubmit={handleRunDebate} isLoading={isRunningDebate} language={language} />
          </div>
        </div>
      </div>
    </main>
  );
}
