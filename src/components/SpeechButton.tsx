"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechButtonProps = {
  text: string;
  lang: "es" | "en" | "la";
  label?: string;
};

function getLangCode(lang: SpeechButtonProps["lang"]) {
  if (lang === "es") return "es-ES";
  if (lang === "la") return "la";
  return "en-US";
}

function chunkText(input: string, maxLen = 650) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!sentence) continue;
    if (!current) {
      current = sentence;
      continue;
    }
    if ((current + " " + sentence).length <= maxLen) {
      current = current + " " + sentence;
      continue;
    }
    chunks.push(current);
    current = sentence;
  }
  if (current) chunks.push(current);
  return chunks;
}

function SpeakerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z"/>
      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd"/>
    </svg>
  );
}

export default function SpeechButton({ text, lang, label }: SpeechButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cancelledRef = useRef(false);

  const chunks = useMemo(() => chunkText(text), [text]);
  const langCode = useMemo(() => getLangCode(lang), [lang]);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    if (chunks.length === 0) return;

    cancelledRef.current = false;
    setIsSpeaking(true);

    const availableVoices = window.speechSynthesis.getVoices();
    const preferredVoice =
      availableVoices.find((v) => v.lang?.toLowerCase() === langCode.toLowerCase()) ??
      availableVoices.find((v) => v.lang?.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase())) ??
      null;

    let index = 0;
    const speakNext = () => {
      if (cancelledRef.current) return;
      if (index >= chunks.length) {
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = langCode;
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.onend = () => {
        index += 1;
        speakNext();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, [chunks, langCode]);

  useEffect(() => {
    if (!isSpeaking) return;
    return () => stop();
  }, [isSpeaking, stop]);

  if (!isSupported) return null;

  const buttonLabel =
    label ?? (lang === "es" ? (isSpeaking ? "Detener audio" : "Escuchar respuesta") : isSpeaking ? "Stop audio" : "Listen to response");

  return (
    <button
      type="button"
      onClick={() => (isSpeaking ? stop() : speak())}
      aria-pressed={isSpeaking}
      aria-label={buttonLabel}
      title={buttonLabel}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
        isSpeaking
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
      }`}
    >
      {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
      <span className="sr-only">{buttonLabel}</span>
    </button>
  );
}
