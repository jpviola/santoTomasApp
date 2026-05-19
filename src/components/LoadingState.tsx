type LoadingStateProps = {
  language?: "es" | "en";
  progress?: number | null;
  message?: string | null;
};

function SkeletonLine({ width }: { width: string }) {
  return (
    <div 
      className="h-3 rounded bg-gradient-to-r from-[var(--surface-muted)] via-[var(--border)] to-[var(--surface-muted)] bg-[length:200%_100%] animate-shimmer" 
      style={{ width }}
    />
  );
}

export default function LoadingState({ language = "en", progress = null, message = null }: LoadingStateProps) {
  const isSpanish = language === "es";
  const label = isSpanish
    ? "Construyendo una disputa escolástica"
    : "Composing a scholastic disputation";
  
  const stageLabel = isSpanish
    ? { moderate: "Moderando pregunta", retrieve: "Recuperando fuentes", generate: "Generando argumentos", respondeo: "Redactando respondeo", finalize: "Finalizando" }
    : { moderate: "Moderating question", retrieve: "Retrieving sources", generate: "Generating arguments", respondeo: "Drafting respondeo", finalize: "Finalizing" };

  const getCurrentStage = (msg: string | null): string => {
    if (!msg) return isSpanish ? "Iniciando..." : "Starting...";
    const m = msg.toLowerCase();
    if (m.includes("moderate")) return stageLabel.moderate;
    if (m.includes("retrieve") || m.includes("sources")) return stageLabel.retrieve;
    if (m.includes("objection") || m.includes("sed contra") || m.includes("generate")) return stageLabel.generate;
    if (m.includes("respondeo")) return stageLabel.respondeo;
    if (m.includes("finalize") || m.includes("complete")) return stageLabel.finalize;
    return isSpanish ? "Procesando..." : "Processing...";
  };

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="h-5 w-5 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{label}</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{getCurrentStage(message)}</p>
          </div>
        </div>
        {typeof progress === "number" ? (
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-[var(--accent)]">{Math.max(0, Math.min(100, progress))}%</p>
          </div>
        ) : null}
      </div>
      
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--muted)]">
          <span>Progress</span>
          <span>{Math.max(0, Math.min(100, progress ?? 0))}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/80 to-[var(--accent)] bg-[length:200%_100%] animate-shimmer transition-all duration-500"
            style={{ 
              width: `${Math.max(0, Math.min(100, progress ?? 5))}%`,
              backgroundPosition: "100% 0"
            }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonLine width="60px" />
          <SkeletonLine width="120px" />
        </div>
        <SkeletonLine width="100%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="95%" />
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[var(--muted)]">
        <span className="flex h-2 w-2 animate-bounce rounded-full bg-[var(--accent)]" style={{ animationDelay: "0ms" }} />
        <span className="flex h-2 w-2 animate-bounce rounded-full bg-[var(--accent)]" style={{ animationDelay: "150ms" }} />
        <span className="flex h-2 w-2 animate-bounce rounded-full bg-[var(--accent)]" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}