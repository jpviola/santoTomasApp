"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type Audience = "undergraduate" | "graduate" | "seminary";

type DebateFormProps = {
  onSubmit: (payload: { question: string; audience: Audience; context?: string }) => Promise<void>;
  isLoading: boolean;
  language?: "es" | "en";
};

export default function DebateForm({ onSubmit, isLoading, language = "en" }: DebateFormProps) {
  const defaultQuestionEn = "Whether artificial intelligence can truly understand";
  const defaultQuestionEs = "Si la inteligencia artificial puede realmente entender";

  const [question, setQuestion] = useState(() => (language === "es" ? defaultQuestionEs : defaultQuestionEn));
  const [audience, setAudience] = useState<Audience>("graduate");
  const [context, setContext] = useState("");

  useEffect(() => {
    setQuestion((current) => {
      if (language === "es" && current === defaultQuestionEn) return defaultQuestionEs;
      if (language === "en" && current === defaultQuestionEs) return defaultQuestionEn;
      return current;
    });
  }, [language]);

  const t =
    language === "es"
      ? {
          question: "Pregunta",
          questionPlaceholder: "Escribe una cuestión escolástica...",
          audience: "Audiencia",
          undergraduate: "Pregrado",
          graduate: "Posgrado",
          seminary: "Seminario",
          context: "Contexto (opcional)",
          contextPlaceholder: "Contexto pedagógico, marco del curso o un ángulo específico...",
          running: "Ejecutando...",
          run: "Ejecutar",
        }
      : {
          question: "Question",
          questionPlaceholder: "Enter a scholastic question...",
          audience: "Audience",
          undergraduate: "Undergraduate",
          graduate: "Graduate",
          seminary: "Seminary",
          context: "Optional context",
          contextPlaceholder: "Add pedagogical context, course framing, or a specific angle...",
          running: "Running debate...",
          run: "Run Debate",
        };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) return;

    await onSubmit({
      question: question.trim(),
      audience,
      context: context.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-5">
        <div>
          <label htmlFor="question" className="mb-2 block text-sm font-medium text-slate-800">
            {t.question}
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            placeholder={t.questionPlaceholder}
          />
        </div>

        <div>
          <label htmlFor="audience" className="mb-2 block text-sm font-medium text-slate-800">
            {t.audience}
          </label>
          <select
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="undergraduate">{t.undergraduate}</option>
            <option value="graduate">{t.graduate}</option>
            <option value="seminary">{t.seminary}</option>
          </select>
        </div>

        <div>
          <label htmlFor="context" className="mb-2 block text-sm font-medium text-slate-800">
            {t.context}
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            placeholder={t.contextPlaceholder}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t.running : t.run}
        </button>
      </div>
    </form>
  );
}
