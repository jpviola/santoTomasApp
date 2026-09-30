"use client";

import { useEffect, useState } from "react";
import type { QuizItem } from "@/lib/learning/types";

type LessonQuizProps = {
  lessonId: string;
  items: QuizItem[];
  language: "es" | "en";
  previousResult?: { correct: number; total: number };
  onComplete: (correct: number, total: number) => void;
};

export default function LessonQuiz({ lessonId, items, language, previousResult, onComplete }: LessonQuizProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null));

  // Nueva lección (o cambio de idioma): quiz en blanco.
  useEffect(() => {
    setAnswers(items.map(() => null));
  }, [lessonId, items]);

  const answeredCount = answers.filter((a) => a !== null).length;
  const correctCount = answers.filter((a, i) => a === items[i]?.answer).length;
  const finished = answeredCount === items.length;

  const t =
    language === "es"
      ? {
          correct: "Correcto.",
          incorrect: "No exactamente.",
          score: `Acertaste ${correctCount} de ${items.length}.`,
          retry: "Volver a intentar",
          previous: previousResult ? `Último resultado: ${previousResult.correct} de ${previousResult.total}` : "",
          question: "Pregunta",
        }
      : {
          correct: "Correct.",
          incorrect: "Not quite.",
          score: `You got ${correctCount} of ${items.length}.`,
          retry: "Try again",
          previous: previousResult ? `Last result: ${previousResult.correct} of ${previousResult.total}` : "",
          question: "Question",
        };

  function choose(questionIndex: number, optionIndex: number) {
    if (answers[questionIndex] !== null) return;
    const next = answers.map((a, i) => (i === questionIndex ? optionIndex : a));
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      onComplete(next.filter((a, i) => a === items[i].answer).length, items.length);
    }
  }

  return (
    <div className="space-y-5">
      {previousResult && answeredCount === 0 && <p className="text-xs text-[var(--muted)]">{t.previous}</p>}

      {items.map((item, qi) => {
        const chosen = answers[qi];
        const answered = chosen !== null;
        return (
          <fieldset key={qi} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="sr-only">
              {t.question} {qi + 1}
            </legend>
            <p className="font-serif text-[16px] font-semibold leading-snug text-[var(--foreground)]">
              <span className="mr-1.5 font-mono text-xs text-[var(--accent)]">{qi + 1}.</span>
              {item.question}
            </p>
            <div className="mt-3 grid gap-1.5">
              {item.options.map((option, oi) => {
                const isCorrect = oi === item.answer;
                const isChosen = oi === chosen;
                const state = !answered
                  ? "idle"
                  : isCorrect
                    ? "correct"
                    : isChosen
                      ? "wrong"
                      : "dim";
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={answered}
                    onClick={() => choose(qi, oi)}
                    aria-pressed={isChosen}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-[14px] leading-snug transition ${
                      state === "idle"
                        ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-strong)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                        : state === "correct"
                          ? "border-[var(--olive)] bg-[color-mix(in_srgb,var(--olive)_12%,transparent)] text-[var(--foreground)]"
                          : state === "wrong"
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                            : "border-[var(--border)] text-[var(--muted)] opacity-70"
                    }`}
                  >
                    <span className="mt-px font-mono text-[11px] uppercase text-[var(--muted)]">{String.fromCharCode(97 + oi)}</span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted-strong)]" role="status">
                <span className={`font-semibold ${chosen === item.answer ? "text-[var(--olive)]" : "text-[var(--accent)]"}`}>
                  {chosen === item.answer ? t.correct : t.incorrect}
                </span>{" "}
                {item.explanation}
              </p>
            )}
          </fieldset>
        );
      })}

      {finished && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <p className="font-serif text-[15px] font-semibold text-[var(--foreground)]">{t.score}</p>
          <button
            type="button"
            onClick={() => setAnswers(items.map(() => null))}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)] transition hover:text-[var(--foreground)]"
          >
            {t.retry}
          </button>
        </div>
      )}
    </div>
  );
}
