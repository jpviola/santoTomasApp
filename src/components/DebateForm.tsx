"use client";

import { type FormEvent, useState, useRef, useEffect } from "react";

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

  const placeholder =
    language === "es"
      ? "Haz una pregunta filosófica..."
      : "Ask a philosophical question...";

  const sendLabel = language === "es" ? "Enviar" : "Send";

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
      <div className="group flex items-end gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-2 backdrop-blur transition">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="min-h-[40px] max-h-[120px] flex-1 resize-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:!outline-none focus:outline-0 focus-visible:!outline-none"
          placeholder={placeholder}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="mb-0.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? "..." : sendLabel}
        </button>
      </div>
    </form>
  );
}
