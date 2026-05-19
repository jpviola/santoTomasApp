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
      ? { placeholder: "Formula una cuestión filosófica o teológica...", send: "Enviar" }
      : { placeholder: "Ask a philosophical or theological question...", send: "Send" };

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
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2 pb-1.5 pt-1.5 shadow-[var(--shadow-soft)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label={t.placeholder}
            aria-required="true"
            className="min-h-[36px] max-h-[120px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] leading-5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:!outline-none focus-visible:!outline-none"
            placeholder={t.placeholder}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            aria-busy={isLoading}
            aria-label={isLoading ? (language === "es" ? "Procesando..." : "Processing...") : t.send}
            className="mb-0.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "..." : t.send}
          </button>
        </div>
      </div>
    </form>
  );
}
