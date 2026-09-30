"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import MiniMarkdown from "@/components/learn/MiniMarkdown";
import { TUTOR_MAX_MESSAGE_CHARS, TUTOR_MAX_MESSAGES } from "@/lib/schemas/tutor";

type Message = { role: "user" | "assistant"; content: string };

type TutorChatProps = {
  lessonId: string;
  lessonTitle: string;
  starters: string[];
  language: "es" | "en";
  className?: string;
};

const storageKey = (lessonId: string, language: string) => `stotomas.learn.tutor.${language}.${lessonId}`;

function loadConversation(lessonId: string, language: string): Message[] {
  try {
    const raw = window.localStorage.getItem(storageKey(lessonId, language));
    const parsed = raw ? (JSON.parse(raw) as Message[]) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m.content === "string") : [];
  } catch {
    return [];
  }
}

function saveConversation(lessonId: string, language: string, messages: Message[]) {
  try {
    if (messages.length === 0) window.localStorage.removeItem(storageKey(lessonId, language));
    else window.localStorage.setItem(storageKey(lessonId, language), JSON.stringify(messages.slice(-TUTOR_MAX_MESSAGES)));
  } catch {
    // Sin almacenamiento: la conversación dura lo que la página.
  }
}

export default function TutorChat({ lessonId, lessonTitle, starters, language, className = "" }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const t =
    language === "es"
      ? {
          title: "Tutor",
          intro: `Preguntá lo que no te haya quedado claro de «${lessonTitle}», o pedí que te ponga a prueba.`,
          placeholder: "Escribí tu pregunta…",
          send: "Enviar",
          reset: "Nueva conversación",
          disclaimer: "El tutor es una IA: puede equivocarse. Contrastá con el texto.",
          error: "El tutor no está disponible en este momento. Probá de nuevo en unos segundos.",
          rateLimited: "Demasiadas preguntas seguidas. Esperá un minuto y volvé a intentar.",
          thinking: "Pensando…",
        }
      : {
          title: "Tutor",
          intro: `Ask about anything in "${lessonTitle}" that isn't clear yet, or ask to be tested.`,
          placeholder: "Type your question…",
          send: "Send",
          reset: "New conversation",
          disclaimer: "The tutor is an AI: it can be wrong. Check it against the text.",
          error: "The tutor is not available right now. Please try again in a few seconds.",
          rateLimited: "Too many questions in a row. Wait a minute and try again.",
          thinking: "Thinking…",
        };

  useEffect(() => {
    abortRef.current?.abort();
    setMessages(loadConversation(lessonId, language));
    setIsStreaming(false);
    setError(null);
    setInput("");
  }, [lessonId, language]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, TUTOR_MAX_MESSAGE_CHARS);
      if (!content || isStreaming) return;

      const history: Message[] = [...messages, { role: "user", content }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let reply = "";

      try {
        const response = await fetch("/api/learn/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ lessonId, language, messages: history.slice(-TUTOR_MAX_MESSAGES) }),
        });
        if (!response.ok || !response.body) {
          throw new Error(response.status === 429 ? t.rateLimited : t.error);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          reply += decoder.decode(value, { stream: true });
          setMessages([...history, { role: "assistant", content: reply }]);
        }
        reply += decoder.decode();

        const finalMessages: Message[] = reply.trim() ? [...history, { role: "assistant", content: reply }] : history;
        setMessages(finalMessages);
        saveConversation(lessonId, language, finalMessages);
        if (!reply.trim()) setError(t.error);
      } catch (err) {
        if (controller.signal.aborted) return;
        // Se conserva la pregunta del estudiante para que pueda reintentar.
        setMessages(history.slice(0, -1));
        setInput(content);
        setError(err instanceof Error && err.message ? err.message : t.error);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsStreaming(false);
        }
      }
    },
    [isStreaming, language, lessonId, messages, t.error, t.rateLimited],
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send(input);
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    setError(null);
    saveConversation(lessonId, language, []);
  }

  return (
    <section
      aria-label={t.title}
      className={`flex flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] font-serif text-sm font-semibold text-[var(--accent)]" aria-hidden="true">
            T
          </span>
          <h2 className="font-serif text-[16px] font-semibold text-[var(--foreground)]">{t.title}</h2>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            {t.reset}
          </button>
        )}
      </div>

      <div ref={scrollRef} className="scholarly-scrollbar min-h-[180px] flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="text-[14px] leading-relaxed text-[var(--muted-strong)]">{t.intro}</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => void send(starter)}
                  disabled={isStreaming}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-left text-[13px] leading-snug text-[var(--muted-strong)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-line rounded-[10px] rounded-br-sm bg-[var(--accent)] px-3 py-2 text-[14px] leading-snug text-[var(--surface)]">
                {message.content}
              </p>
            </div>
          ) : (
            <div key={index} className="max-w-[95%] space-y-2 font-serif text-[15px] leading-[1.65] text-[var(--foreground)]">
              {message.content ? <MiniMarkdown text={message.content} /> : <p className="animate-pulse font-sans text-[13px] text-[var(--muted)]">{t.thinking}</p>}
            </div>
          ),
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-200">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-2.5">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={TUTOR_MAX_MESSAGE_CHARS}
            aria-label={t.placeholder}
            placeholder={t.placeholder}
            disabled={isStreaming}
            className="max-h-[120px] min-h-[36px] flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-2 text-[14px] leading-5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus-visible:!outline-none"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--surface)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStreaming ? "…" : t.send}
          </button>
        </div>
        <p className="mt-1.5 px-0.5 text-[11px] text-[var(--muted)]">{t.disclaimer}</p>
      </form>
    </section>
  );
}
