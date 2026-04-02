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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3 animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
        <div className="h-4 w-4/6 rounded bg-slate-100" />
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm text-slate-500">{label}</p>
        {message ? <p className="text-sm font-medium text-slate-700">{message}</p> : null}
        {typeof progress === "number" ? (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-slate-300" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
            </div>
            <p className="text-xs text-slate-500">{Math.max(0, Math.min(100, progress))}%</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
