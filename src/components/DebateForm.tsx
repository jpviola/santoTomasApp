"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { DebateInputSchema } from "@/lib/schemas/debate";

type DebateFormProps = {
  onSubmit: (payload: { question: string; context?: string }) => Promise<void>;
  isLoading: boolean;
  language: "es" | "en";
};

export default function DebateForm({ onSubmit, isLoading, language }: DebateFormProps) {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (showContext) contextRef.current?.focus();
  }, [showContext]);

  const t =
    language === "es"
      ? {
          placeholder: "Formula una cuestión filosófica o teológica...",
          send: "Enviar",
          processing: "Procesando...",
          contextLabel: "Contexto adicional (opcional)",
          contextPlaceholder: "Agrega detalles, curso, o marco de referencia...",
          showContext: "+ Agregar contexto",
          hideContext: "- Ocultar contexto",
          errorShort: "La pregunta debe tener al menos 5 caracteres.",
        }
      : {
          placeholder: "Ask a philosophical or theological question...",
          send: "Send",
          processing: "Processing...",
          contextLabel: "Additional context (optional)",
          contextPlaceholder: "Add details, course, or reference framework...",
          showContext: "+ Add context",
          hideContext: "- Hide context",
          errorShort: "Question must be at least 5 characters.",
        };

  function validate(): string | null {
    const result = DebateInputSchema.safeParse({ question });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return firstIssue?.message ?? null;
    }
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedContext = context.trim() || undefined;
    await onSubmit({ question: trimmedQuestion, context: trimmedContext });
    setQuestion("");
    setContext("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && e.target === textareaRef.current) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2 pb-1.5 pt-1.5 shadow-[var(--shadow-soft)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label={t.placeholder}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "debate-form-error" : undefined}
            className="min-h-[36px] max-h-[120px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] leading-5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:!outline-none focus-visible:!outline-none"
            placeholder={t.placeholder}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            aria-busy={isLoading}
            aria-label={isLoading ? t.processing : t.send}
            className="mb-0.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "..." : t.send}
          </button>
        </div>

        {error && (
          <p id="debate-form-error" className="mt-1.5 px-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {!showContext ? (
          <button
            type="button"
            onClick={() => setShowContext(true)}
            className="mt-1.5 px-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            {t.showContext}
          </button>
        ) : (
          <div className="mt-2 border-t border-[var(--border)] pt-2">
            <label className="mb-1 block px-1 text-xs font-medium text-[var(--muted)]">
              {t.contextLabel}
            </label>
            <textarea
              ref={contextRef}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              className="min-h-[32px] max-h-[80px] w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-[13px] leading-5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus-visible:!outline-none"
              placeholder={t.contextPlaceholder}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowContext(false)}
              className="mt-1 px-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              {t.hideContext}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
