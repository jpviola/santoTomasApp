"use client";

interface DebateProgressBarProps {
  progress: number;
  message: string;
  language: "es" | "en";
}

export default function DebateProgressBar({ progress, message, language }: DebateProgressBarProps) {
  const isSpanish = language === "es";
  
  const stageLabel = isSpanish
    ? { start: "Iniciando", moderate: "Moderando", retrieve: "Recuperando fuentes", generate: "Generando debate", finalize: "Finalizando", done: "Completado" }
    : { start: "Starting", moderate: "Moderating", retrieve: "Retrieving sources", generate: "Generating debate", finalize: "Finalizing", done: "Completed" };

  const getStageFromMessage = (msg: string): keyof typeof stageLabel => {
    const m = msg.toLowerCase();
    if (m.includes("start")) return "start";
    if (m.includes("moderate")) return "moderate";
    if (m.includes("retrieve") || m.includes("sources")) return "retrieve";
    if (m.includes("objection") || m.includes("sed contra") || m.includes("generate")) return "generate";
    if (m.includes("finalize") || m.includes("respondeo")) return "finalize";
    if (m.includes("done") || m.includes("complete")) return "done";
    return "start";
  };

  const currentStage = getStageFromMessage(message);

  return (
    <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-center justify-center">
          <div className="relative h-8 w-8">
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--surface-strong)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress} 100`}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
              {progress}%
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">
            {stageLabel[currentStage]}
          </p>
          <p className="text-xs text-[var(--muted)] truncate">
            {message}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          {[0, 25, 50, 75, 100].map((p) => (
            <div
              key={p}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                progress >= p ? "bg-[var(--accent)]" : "bg-[var(--surface-strong)]"
              }`}
            />
          ))}
        </div>
      </div>
      
      <div className="h-0.5 bg-[var(--surface-strong)]">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}