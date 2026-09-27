"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { LearnLanguage } from "@/lib/learning/types";

export type LessonProgress = {
  completedAt?: string;
  quizCorrect?: number;
  quizTotal?: number;
};

type ProgressState = {
  lessons: Record<string, LessonProgress>;
  lastLessonId?: string;
};

type LearnContextValue = {
  language: LearnLanguage;
  setLanguage: (language: LearnLanguage) => void;
  progress: ProgressState;
  markVisited: (lessonId: string) => void;
  setCompleted: (lessonId: string, completed: boolean) => void;
  recordQuiz: (lessonId: string, correct: number, total: number) => void;
  resetProgress: () => void;
};

const PROGRESS_KEY = "stotomas.learn.progress.v1";
const LANGUAGE_KEY = "stotomas.language";
const EMPTY: ProgressState = { lessons: {} };

function readProgress(): ProgressState {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as ProgressState;
    return parsed && typeof parsed.lessons === "object" ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeProgress(state: ProgressState) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // Almacenamiento no disponible (modo privado, bloqueado): el progreso vive solo en memoria.
  }
}

const LearnContext = createContext<LearnContextValue | null>(null);

export function LearnProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LearnLanguage>("es");
  const [progress, setProgress] = useState<ProgressState>(EMPTY);

  useEffect(() => {
    setProgress(readProgress());
    try {
      if (window.localStorage.getItem(LANGUAGE_KEY) === "en") setLanguageState("en");
    } catch {
      // idem
    }
  }, []);

  const setLanguage = useCallback((next: LearnLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // idem
    }
  }, []);

  const update = useCallback((fn: (state: ProgressState) => ProgressState) => {
    setProgress((current) => {
      const next = fn(current);
      writeProgress(next);
      return next;
    });
  }, []);

  const markVisited = useCallback(
    (lessonId: string) => update((s) => (s.lastLessonId === lessonId ? s : { ...s, lastLessonId: lessonId })),
    [update],
  );

  const setCompleted = useCallback(
    (lessonId: string, completed: boolean) =>
      update((s) => ({
        ...s,
        lessons: {
          ...s.lessons,
          [lessonId]: { ...s.lessons[lessonId], completedAt: completed ? new Date().toISOString() : undefined },
        },
      })),
    [update],
  );

  const recordQuiz = useCallback(
    (lessonId: string, correct: number, total: number) =>
      update((s) => ({
        ...s,
        lessons: { ...s.lessons, [lessonId]: { ...s.lessons[lessonId], quizCorrect: correct, quizTotal: total } },
      })),
    [update],
  );

  const resetProgress = useCallback(() => update(() => EMPTY), [update]);

  const value = useMemo(
    () => ({ language, setLanguage, progress, markVisited, setCompleted, recordQuiz, resetProgress }),
    [language, setLanguage, progress, markVisited, setCompleted, recordQuiz, resetProgress],
  );

  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>;
}

export function useLearn(): LearnContextValue {
  const context = useContext(LearnContext);
  if (!context) throw new Error("useLearn must be used inside LearnProvider");
  return context;
}
