"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

type DebateFormProps = {
  onSubmit: (payload: { question: string }) => Promise<void>;
  isLoading: boolean;
  language: "es" | "en";
};

export default function DebateForm({ onSubmit, isLoading, language }: DebateFormProps) {
  const [question, setQuestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const t =
    language === "es"
      ? {
          placeholder: "Formula una cuestión filosófica o teológica...",
          send: "Enviar",
          mode: "Disputa",
          context: "Fuentes tomistas",
        }
      : {
          placeholder: "Ask a philosophical or theological question...",
          send: "Send",
          mode: "Dispute",
          context: "Thomistic sources",
        };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    await onSubmit({ question: question.trim() });
    setQuestion("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)]">
        <div className="mb-2 flex flex-wrap items-center gap-2 px-2 pt-1">
          <span className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--accent)]">
            {t.mode}
          </span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)]">
            {t.context}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label={t.placeholder}
            aria-required="true"
            className="min-h-[44px] max-h-[144px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:!outline-none focus-visible:!outline-none"
            placeholder={t.placeholder}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            aria-busy={isLoading}
            aria-label={isLoading ? (language === "es" ? "Procesando..." : "Processing...") : t.send}
            className="mb-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "..." : t.send}
          </button>
        </div>
      </div>
    </form>
  );
}
