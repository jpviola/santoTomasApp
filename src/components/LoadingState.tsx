type LoadingStateProps = {
  language?: "es" | "en";
  progress?: number | null;
  message?: string | null;
};

export default function LoadingState({ language = "en", progress = null, message = null }: LoadingStateProps) {
  const label =
    language === "es"
      ? "Construyendo una disputa escolástica"
      : "Composing a scholastic disputation";

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{label}</p>
          {message ? <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{message}</p> : null}
        </div>
        {typeof progress === "number" ? (
          <p className="font-mono text-xs text-[var(--muted)]">{Math.max(0, Math.min(100, progress))}%</p>
        ) : null}
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width]"
          style={{ width: `${Math.max(0, Math.min(100, progress ?? 10))}%` }}
        />
      </div>
      <div className="mt-5 space-y-2 motion-safe:animate-pulse">
        <div className="h-4 w-2/5 rounded bg-[var(--surface-muted)]" />
        <div className="h-3 w-full rounded bg-[var(--surface-muted)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
