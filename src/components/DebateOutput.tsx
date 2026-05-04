"use client";

import { useState } from "react";
import type { DebateOutput } from "@/types/debate";
import SourceList from "@/components/SourceList";
import SpeechButton from "@/components/SpeechButton";

type DebateOutputProps = {
  result: DebateOutput;
  language: "es" | "en";
  contentLanguage?: "es" | "en" | "la";
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  );
}

function ChatBubble({
  label,
  text,
  children,
  isUser,
  contentLang,
}: {
  label: string;
  text: string;
  children?: React.ReactNode;
  isUser?: boolean;
  contentLang: "es" | "en" | "la";
}) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl border p-4 backdrop-blur ${
          isUser
            ? "border-blue-400/20 bg-gradient-to-r from-blue-500/15 via-white/8 to-blue-400/15"
            : "border-white/10 bg-white/8"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{label}</div>
          <div className="flex items-center gap-1">
            <SpeechButton text={text} lang={contentLang} />
            <CopyButton text={text} />
          </div>
        </div>
        <div className="mt-2 text-sm leading-7 text-slate-200/90">{children ?? text}</div>
      </div>
    </div>
  );
}

export default function DebateOutput({ result, language, contentLanguage }: DebateOutputProps) {
  const contentLang = contentLanguage ?? language;
  const t =
    language === "es"
      ? {
          question: "Pregunta",
          objections: "Objeciones",
          sedContra: "Sed contra",
          respondeo: "Respondeo",
          replies: "Réplicas",
          application: "Aplicación",
          sources: "Fuentes",
        }
      : {
          question: "Question",
          objections: "Objections",
          sedContra: "Sed Contra",
          respondeo: "Respondeo",
          replies: "Replies",
          application: "Application",
          sources: "Sources",
        };

  return (
    <div className="space-y-4">
      <ChatBubble label={t.question} text={result.question} isUser contentLang={contentLang} />

      <ChatBubble label={t.objections} text={result.objections.join("\n")} contentLang={contentLang}>
        <ol className="list-decimal space-y-3 pl-5">
          {result.objections.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ol>
      </ChatBubble>

      <ChatBubble label={t.sedContra} text={result.sedContra} contentLang={contentLang} />

      <ChatBubble label={t.respondeo} text={result.respondeo} contentLang={contentLang} />

      <ChatBubble label={t.replies} text={result.replies.join("\n")} contentLang={contentLang}>
        <ol className="list-decimal space-y-3 pl-5">
          {result.replies.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </ChatBubble>

      <ChatBubble label={t.application} text={result.application} contentLang={contentLang} />

      {/* Sources - full width */}
      <div className="w-full rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">{t.sources}</div>
        <div className="mt-3">
          <SourceList sources={result.sources} language={language} />
        </div>
      </div>
    </div>
  );
}
