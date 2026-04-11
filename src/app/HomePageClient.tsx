"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import DebateForm from "@/components/DebateForm";
import DebateHistoryList from "@/components/DebateHistoryList";
import DebateOutput from "@/components/DebateOutput";
import LoadingState from "@/components/LoadingState";
import AuthControls from "@/components/AuthControls";
import type { DebateOutput as DebateOutputType } from "@/types/debate";
import type { DebateHistoryItem } from "@/types/history";

type RunDebatePayload = {
  question: string;
  audience: "undergraduate" | "graduate" | "seminary";
  context?: string;
};

type DebateTaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

type DebateTask = {
  id: string;
  status: DebateTaskStatus;
  progress: number;
  message: string | null;
  error: string | null;
  recordId: string | null;
};

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<"es" | "en">(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("stotomas.language");
      if (stored === "es" || stored === "en") {
        return stored;
      }
    }
    return "es";
  });
  const [answerLanguage, setAnswerLanguage] = useState<"es" | "en" | "la">(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("stotomas.answerLanguage");
      if (stored === "es" || stored === "en" || stored === "la") {
        return stored;
      }
    }
    return "es";
  });
  const [result, setResult] = useState<DebateOutputType | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const [isRunningDebate, setIsRunningDebate] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<"es" | "en" | "la">("es");

  const [historyItems, setHistoryItems] = useState<DebateHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);

  const [isLoadingSavedDebate, setIsLoadingSavedDebate] = useState(false);
  const [activeTask, setActiveTask] = useState<DebateTask | null>(null);
  const [bannerSrc, setBannerSrc] = useState("/aquinas-banner.webp");
  const [isBannerAvailable, setIsBannerAvailable] = useState(true);

  const selectedId = useMemo(() => searchParams.get("id"), [searchParams]);

  const fetchJsonWithTimeout = useCallback(async (url: string, init: RequestInit, timeoutMs: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const data = await response.json().catch(() => null);
      return { response, data };
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const requestWithRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    maxRetries = 3,
    initialDelayMs = 600,
  ): Promise<T> => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        if (attempt === maxRetries - 1) {
          throw err;
        }

        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Retry failed.");
  }, []);

  const getApiError = useCallback((data: unknown, fallback: string) => {
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      const errorValue = typeof record.error === "string" ? record.error : null;
      const detailsValue = typeof record.details === "string" ? record.details : null;
      return detailsValue || errorValue || fallback;
    }
    return fallback;
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    setHistoryWarning(null);

    try {
      const { response, data } = await fetchJsonWithTimeout("/api/debate/history", { method: "GET" }, 20000);

      if (!response.ok) {
        throw new Error(
          getApiError(data, language === "es" ? "No se pudo cargar el historial de debates." : "Failed to fetch debate history."),
        );
      }

      if (!data || typeof data !== "object" || !("items" in (data as Record<string, unknown>))) {
        throw new Error("Malformed history response.");
      }

      const itemsValue = (data as Record<string, unknown>).items;
      if (!Array.isArray(itemsValue)) {
        throw new Error("Malformed history response.");
      }

      const warningValue = (data as Record<string, unknown>).warning;
      if (typeof warningValue === "string" && warningValue.trim().length > 0) {
        setHistoryWarning(warningValue);
      }
      setHistoryItems(itemsValue as DebateHistoryItem[]);
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? language === "es"
            ? "El historial tardó demasiado en responder."
            : "History request timed out."
          : err instanceof Error
            ? err.message
            : language === "es"
              ? "Error desconocido del historial."
              : "Unknown history error.";
      setHistoryError(message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [fetchJsonWithTimeout, getApiError, language]);

  const setUrlId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!id) {
        params.delete("id");
      } else {
        params.set("id", id);
      }
      const query = params.toString();
      router.replace(query.length > 0 ? `/?${query}` : "/");
    },
    [router, searchParams],
  );

  const fetchDebateById = useCallback(
    async (id: string, updateUrl = true) => {
      setIsLoadingSavedDebate(true);
      setRunError(null);

      try {
        const { response, data } = await requestWithRetry(() =>
          fetchJsonWithTimeout(`/api/debate/${id}`, { method: "GET" }, 20000),
        );

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch saved debate.");
        }

        const hydratedResult: DebateOutputType = {
          question: data.question,
          objections: data.objections,
          sedContra: data.sedContra,
          respondeo: data.respondeo,
          replies: data.replies,
          application: data.application,
          sources: data.sources,
          metadata: {
            audience: data.audience,
            generatedAt: new Date(data.generatedAt).toISOString(),
          },
          recordId: data.id,
        };

        setOutputLanguage(language);
        setResult(hydratedResult);
        setActiveRecordId(data.id);
        if (updateUrl) {
          setUrlId(data.id);
        }
      } catch (err) {
        const message =
          err instanceof Error && err.name === "AbortError"
            ? language === "es"
              ? "La carga del debate guardado tardó demasiado."
              : "Saved debate request timed out."
            : err instanceof Error
              ? err.message
              : language === "es"
                ? "Error desconocido al cargar el debate."
                : "Unknown debate loading error.";
        setRunError(message);
      } finally {
        setIsLoadingSavedDebate(false);
      }
    },
    [fetchJsonWithTimeout, language, requestWithRetry, setUrlId],
  );

  const formatTaskMessage = useCallback(
    (stage: string | null) => {
      if (!stage) return null;

      const es: Record<string, string> = {
        start: "Iniciando…",
        moderate_and_retrieve: "Moderando la pregunta y recuperando fuentes…",
        objections_and_sed_contra: "Generando objeciones y sed contra…",
        respondeo: "Redactando el respondeo y la aplicación…",
        replies: "Escribiendo las réplicas…",
        finalize: "Cerrando la salida estructurada…",
        done: "Listo.",
        failed: "Falló.",
      };

      const en: Record<string, string> = {
        start: "Starting…",
        moderate_and_retrieve: "Moderating question and retrieving sources…",
        objections_and_sed_contra: "Generating objections and sed contra…",
        respondeo: "Drafting respondeo and application…",
        replies: "Writing replies…",
        finalize: "Finalizing structured output…",
        done: "Done.",
        failed: "Failed.",
      };

      const dictionary = language === "es" ? es : en;
      return dictionary[stage] ?? stage;
    },
    [language],
  );

  const handleRunDebate = useCallback(
    async (payload: RunDebatePayload) => {
      setIsRunningDebate(true);
      setRunError(null);
      setActiveTask(null);
      setResult(null);
      setActiveRecordId(null);
      setOutputLanguage(answerLanguage);

      try {
        const { response: createResponse, data: createData } = await requestWithRetry(
          () =>
            fetchJsonWithTimeout(
              "/api/debate/tasks",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...payload, language: answerLanguage }),
              },
              20000,
            ),
          3,
          700,
        );

        if (!createResponse.ok) {
          throw new Error(createData?.details || createData?.error || "Failed to start debate task.");
        }

        const taskId = typeof createData?.taskId === "string" ? createData.taskId : null;
        if (!taskId) {
          throw new Error("Malformed task create response.");
        }

        setActiveTask({
          id: taskId,
          status: "PENDING",
          progress: 0,
          message: "start",
          error: null,
          recordId: null,
        });

        const startedAt = Date.now();

        while (true) {
          if (Date.now() - startedAt > 300000) {
            throw new Error(
              language === "es"
                ? "La generación tardó demasiado (timeout)."
                : "Generation took too long (timeout).",
            );
          }

          const { response: statusResponse, data: statusData } = await requestWithRetry(
            () => fetchJsonWithTimeout(`/api/debate/tasks/${taskId}`, { method: "GET" }, 20000),
            2,
            600,
          );

          if (!statusResponse.ok) {
            throw new Error(statusData?.error || "Failed to fetch task status.");
          }

          const rawStatus = typeof statusData?.status === "string" ? statusData.status : "PROCESSING";
          const status: DebateTaskStatus = (["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const).includes(
            rawStatus as DebateTaskStatus,
          )
            ? (rawStatus as DebateTaskStatus)
            : "PROCESSING";

          const task: DebateTask = {
            id: typeof statusData?.id === "string" ? statusData.id : taskId,
            status,
            progress: typeof statusData?.progress === "number" ? statusData.progress : 0,
            message: typeof statusData?.message === "string" ? statusData.message : null,
            error: typeof statusData?.error === "string" ? statusData.error : null,
            recordId: typeof statusData?.recordId === "string" ? statusData.recordId : null,
          };

          setActiveTask(task);

          if (task.status === "COMPLETED" && task.recordId) {
            await fetchDebateById(task.recordId, true);
            await fetchHistory();
            setActiveTask(null);
            break;
          }

          if (task.status === "FAILED") {
            throw new Error(task.error || "Debate task failed.");
          }

          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      } catch (err) {
        const message =
          err instanceof Error && err.name === "AbortError"
            ? language === "es"
              ? "La solicitud tardó demasiado (timeout)."
              : "Request timed out."
            : err instanceof Error
              ? err.message
              : language === "es"
                ? "Ocurrió un error desconocido."
                : "Unknown error occurred.";
        setRunError(message);
        setResult(null);
        setActiveRecordId(null);
        setUrlId(null);
        setActiveTask(null);
      } finally {
        setIsRunningDebate(false);
      }
    },
    [answerLanguage, fetchDebateById, fetchHistory, fetchJsonWithTimeout, language, requestWithRetry, setUrlId],
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    window.localStorage.setItem("stotomas.language", language);
  }, [language]);

  useEffect(() => {
    setAnswerLanguage((current) => (current === "la" ? "la" : language));
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem("stotomas.answerLanguage", answerLanguage);
  }, [answerLanguage]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    if (selectedId === activeRecordId) {
      return;
    }
    fetchDebateById(selectedId, false);
  }, [activeRecordId, fetchDebateById, selectedId]);

  const t =
    language === "es"
      ? {
          title: "Santo Tomás de Aquino Digital",
          subtitle: "Sistema de debate multi‑agente para filosofía, teología y experimentación en aula.",
          errorTitle: "Error",
          empty:
            "Escribe una pregunta o reabre un debate guardado desde el historial para ver una disputa escolástica estructurada con objeciones, sed contra, respondeo, réplicas y fuentes.",
          langToggle: "ES/EN",
        }
      : {
          title: "Digital Aquinas",
          subtitle: "A scholastic multi-agent debate system for philosophy, theology, and classroom experimentation.",
          errorTitle: "Error",
          empty:
            "Enter a question or reopen a saved debate from the history panel to view a structured scholastic disputation with objections, sed contra, respondeo, replies, and source grounding.",
          langToggle: "ES/EN",
        };

  return (
    <main id="main-content" className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300">
                {t.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300/80">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <AuthControls language={language} />
              <button
                type="button"
                onClick={() => setAnswerLanguage((v) => (v === "la" ? language : "la"))}
                aria-pressed={answerLanguage === "la"}
                className={`rounded-full border px-4 py-2 text-sm font-medium shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur transition ${
                  answerLanguage === "la"
                    ? "border-white/20 bg-gradient-to-r from-violet-500/25 via-white/5 to-blue-500/20 text-slate-100"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                LAT
              </button>
              <button
                type="button"
                onClick={() => setLanguage((v) => (v === "es" ? "en" : "es"))}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur transition hover:bg-white/10"
              >
                {t.langToggle}
              </button>
            </div>
          </div>
        </header>

        <div className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
            <div className="relative min-h-[220px] md:min-h-[260px]">
              {isBannerAvailable ? (
                <Image
                  src={bannerSrc}
                  alt={language === "es" ? "Ilustración inspirada en Santo Tomás de Aquino" : "Illustration inspired by Thomas Aquinas"}
                  fill
                  priority
                  className="object-cover"
                  onError={() => {
                    if (bannerSrc.endsWith(".webp")) {
                      setBannerSrc("/aquinas-banner.jpg");
                      return;
                    }
                    setIsBannerAvailable(false);
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/25 via-white/5 to-blue-500/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
            </div>

            <div className="flex items-center p-6 md:p-8">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/70">
                  {language === "es" ? "Disputatio" : "Disputatio"}
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-100">
                  {language === "es"
                    ? "Formula una cuestión. Obtén una disputa. Guarda y exporta."
                    : "Ask a question. Get a disputation. Save and export."}
                </h2>
                <p className="text-sm leading-6 text-slate-200/75">
                  {language === "es"
                    ? "Pipeline multi‑agente con progreso, historial reutilizable y exportación a Markdown."
                    : "Multi-agent pipeline with progress, reusable history, and Markdown export."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[340px_420px_minmax(0,1fr)]">
          <div>
            <DebateHistoryList
              items={historyItems}
              activeId={activeRecordId}
              isLoading={isHistoryLoading}
              error={historyError}
              warning={historyWarning}
              onSelect={fetchDebateById}
              onRefresh={fetchHistory}
              language={language}
            />
          </div>

          <div>
            <DebateForm onSubmit={handleRunDebate} isLoading={isRunningDebate} language={language} />
          </div>

          <div className="space-y-6">
            {(isRunningDebate || isLoadingSavedDebate) && (
              <LoadingState
                language={language}
                progress={activeTask?.progress ?? null}
                message={formatTaskMessage(activeTask?.message ?? null)}
              />
            )}

            {runError ? (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
                <p className="font-medium">{t.errorTitle}</p>
                <p className="mt-1 text-red-100/90">{runError}</p>
              </div>
            ) : null}

            {!isRunningDebate && !isLoadingSavedDebate && !runError && result ? (
              <DebateOutput result={result} language={language} contentLanguage={outputLanguage} />
            ) : null}

            {!isRunningDebate && !isLoadingSavedDebate && !runError && !result ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
                <p className="text-sm leading-7 text-slate-200/85">{t.empty}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
