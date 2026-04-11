type LoadingStateProps = {
  language?: "es" | "en";
  progress?: number | null;
  message?: string | null;
};

export default function LoadingState({ language = "en", progress = null, message = null }: LoadingStateProps) {
  const label =
    language === "es"
      ? "Ejecutando el pipeline de disputa escolástica..."
      : "Running the scholastic debate pipeline...";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="space-y-3 motion-safe:animate-pulse">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="h-4 w-5/6 rounded bg-white/5" />
        <div className="h-4 w-4/6 rounded bg-white/5" />
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm text-slate-300/70">{label}</p>
        {message ? <p className="text-sm font-medium text-slate-100">{message}</p> : null}
        {typeof progress === "number" ? (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <p className="text-xs text-slate-300/70">{Math.max(0, Math.min(100, progress))}%</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
