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
    label ?? (lang === "es" ? (isSpeaking ? "Detener audio" : "Escuchar") : isSpeaking ? "Stop audio" : "Listen");

  return (
    <button
      type="button"
      onClick={() => (isSpeaking ? stop() : speak())}
      aria-pressed={isSpeaking}
      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
    >
      {buttonLabel}
    </button>
  );
}
