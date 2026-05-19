"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DebateOutput as DebateOutputType } from "@/types/debate";
import type { DebateHistoryItem } from "@/types/history";
import { type DebateTask } from "@/lib/schemas/task";

export type RunDebatePayload = {
  question: string;
};

function getStreamErrorMessage(data: unknown) {
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    const errorData = data as { message?: unknown; error?: unknown; code?: unknown };
    const message = typeof errorData.message === "string"
      ? errorData.message
      : typeof errorData.error === "string"
        ? errorData.error
        : null;
    const code = typeof errorData.code === "string" ? errorData.code : null;

    if (message && code === "LLM_PROVIDER_ERROR") {
      return `${message} Verifica que el modelo configurado este disponible y que la API key tenga credito/permisos.`;
    }

    return message ?? "Unexpected stream error.";
  }
  return "Unexpected stream error.";
}

export function useDebateManager(
  language: "es" | "en",
  answerLanguage: "es" | "en" | "la",
) {
  const [result, setResult] = useState<DebateOutputType | null>(null);
  const [isRunningDebate, setIsRunningDebate] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<"es" | "en" | "la">("es");

  const [historyItems, setHistoryItems] = useState<DebateHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [isLoadingSavedDebate, setIsLoadingSavedDebate] = useState(false);
  const [activeTask, setActiveTask] = useState<DebateTask | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

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
        if (attempt === maxRetries - 1) throw err;
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Retry failed.");
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const { response, data } = await fetchJsonWithTimeout("/api/debate/history", { method: "GET" }, 20000);
      if (!response.ok) throw new Error("Failed to fetch debate history.");
      if (!data || !Array.isArray((data as Record<string, unknown>).items)) throw new Error("Malformed response.");
      setHistoryItems((data as Record<string, unknown>).items as DebateHistoryItem[]);
    } catch {
      setHistoryItems([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [fetchJsonWithTimeout]);

  const fetchDebateById = useCallback(
    async (id: string) => {
      setIsLoadingSavedDebate(true);
      setRunError(null);
      try {
        const { response, data } = await requestWithRetry(() =>
          fetchJsonWithTimeout(`/api/debate/${id}`, { method: "GET" }, 20000),
        );
        if (!response.ok) throw new Error(data?.error || "Failed to fetch saved debate.");

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
      } catch (err) {
        setRunError(err instanceof Error ? err.message : "Unknown error loading debate.");
      } finally {
        setIsLoadingSavedDebate(false);
      }
    },
    [fetchJsonWithTimeout, language, requestWithRetry],
  );

  const formatTaskMessage = useCallback(
    (stage: string | null) => {
      if (!stage) return null;
      const dict = language === "es"
        ? {
            start: "Iniciando…",
            moderate_and_retrieve: "Moderando la pregunta y recuperando fuentes…",
            objections_and_sed_contra: "Generando objeciones y sed contra…",
            respondeo: "Redactando el respondeo…",
            replies: "Escribiendo las réplicas…",
            finalize: "Finalizando…",
            done: "Listo.",
            failed: "Falló.",
          }
        : {
            start: "Starting…",
            moderate_and_retrieve: "Moderating question and retrieving sources…",
            objections_and_sed_contra: "Generating objections and sed contra…",
            respondeo: "Drafting respondeo…",
            replies: "Writing replies…",
            finalize: "Finalizing…",
            done: "Done.",
            failed: "Failed.",
          };
      return (dict as Record<string, string>)[stage] ?? stage;
    },
    [language],
  );

  const handleRunDebate = useCallback(
    async (payload: { question: string; audience?: string; context?: string }, lang?: "es" | "en" | "la") => {
      setIsRunningDebate(true);
      setRunError(null);
      setActiveTask(null);
      setResult(null);
      const langToUse = lang ?? answerLanguage;
      setOutputLanguage(langToUse);

      try {
        const controller = new AbortController();
        let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
        const resetInactivityTimeout = () => {
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
          inactivityTimeout = setTimeout(() => controller.abort(), 120000);
        };
        resetInactivityTimeout();

        // Cambiamos a un endpoint que soporte streaming (ej: /api/debate/process)
        const response = await fetch(
          "/api/debate/process",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              question: payload.question,
              language: langToUse,
              audience: payload.audience || "undergraduate",
              context: payload.context || "",
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          let errorMessage = "Error al procesar el debate.";
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            errorMessage = `Server error (${response.status}): ${errorText.slice(0, 100)}`;
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) throw new Error("No se pudo inicializar el lector de flujo.");

        let buffer = "";

        const handleLine = async (line: string) => {
          if (!line.trim()) return;

          let chunk: { type?: string; data?: unknown };
          try {
            chunk = JSON.parse(line);
          } catch (e) {
            console.error("Error parseando chunk de stream", e);
            return;
          }

          if (chunk.type === "progress") {
            const progressData = chunk.data as { progress?: number; stage?: string } | null;
            setActiveTask({
              id: "streaming",
              status: "PENDING",
              progress: progressData?.progress ?? 0,
              message: progressData?.stage ?? null,
              error: null,
              recordId: null,
            });
          } else if (chunk.type === "result") {
            const taskData = chunk.data as { result?: DebateOutputType; recordId?: string | null };
            if (taskData.result) {
              setResult({ ...taskData.result, recordId: taskData.recordId ?? undefined });
            } else if (taskData.recordId) {
              await fetchDebateById(taskData.recordId);
            }
            setActiveTask(null);
            void fetchHistory();
          } else if (chunk.type === "error") {
            throw new Error(getStreamErrorMessage(chunk.data));
          }
        };

        try {
          while (mountedRef.current) {
            const { done, value } = await reader.read();
            if (done) break;
            resetInactivityTimeout();

            buffer += decoder.decode(value, { stream: true });

            // Procesamos cada línea (cada evento del stream)
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Guardamos el resto incompleto

            for (const line of lines) {
              await handleLine(line);
            }
          }

          if (buffer.trim()) {
            await handleLine(buffer);
          }
        } finally {
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
        }
      } catch (err) {
        const message = err instanceof Error && err.name === "AbortError"
          ? "La generación tardó demasiado sin enviar avances. Probá de nuevo con una pregunta más breve."
          : err instanceof Error
            ? err.message
            : "Unknown error occurred.";
        setRunError(message);
        setResult(null);
        setActiveTask(null);
      } finally {
        setIsRunningDebate(false);
      }
    },
    [answerLanguage, fetchDebateById, fetchHistory],
  );

  const handleNewQuestion = useCallback(() => {
    setResult(null);
    setRunError(null);
    setActiveTask(null);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    result,
    setResult,
    isRunningDebate,
    runError,
    outputLanguage,
    historyItems,
    isHistoryLoading,
    isLoadingSavedDebate,
    activeTask,
    fetchHistory,
    fetchDebateById,
    formatTaskMessage,
    handleRunDebate,
    handleNewQuestion,
    setOutputLanguage,
  };
}
