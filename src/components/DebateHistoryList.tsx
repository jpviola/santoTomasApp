"use client";

import type { DebateHistoryItem } from "@/types/history";

type DebateHistoryListProps = {
  items: DebateHistoryItem[];
  activeId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  warning?: string | null;
  onSelect: (id: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  language?: "es" | "en";
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

export default function DebateHistoryList({
  items,
  activeId,
  isLoading = false,
  error = null,
  warning = null,
  onSelect,
  onRefresh,
  language = "en",
}: DebateHistoryListProps) {
  const t =
    language === "es"
      ? {
          title: "Debates Recientes",
          subtitle: "Disputas guardadas y ejecuciones previas",
          refresh: "Actualizar",
          loadingErrorTitle: "No se pudo cargar el historial",
          empty: "Aún no hay debates guardados.",
          audience: "Audiencia",
          saved: "Guardado",
        }
      : {
          title: "Recent Debates",
          subtitle: "Saved disputations and past runs",
          refresh: "Refresh",
          loadingErrorTitle: "Could not load history",
          empty: "No saved debates yet.",
          audience: "Audience",
          saved: "Saved",
        };

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">{t.title}</h2>
          <p className="text-xs text-slate-300/70">{t.subtitle}</p>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={() => onRefresh()}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            {t.refresh}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="h-4 w-5/6 rounded bg-white/10" />
              <div className="mt-2 h-3 w-2/3 rounded bg-white/5" />
              <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100">
          <p className="font-medium">{t.loadingErrorTitle}</p>
          <p className="mt-1 text-red-100/90">{error}</p>
        </div>
      ) : null}

      {!isLoading && !error && warning ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          <p className="font-medium">{language === "es" ? "Aviso" : "Notice"}</p>
          <p className="mt-1 text-amber-100/90">{warning}</p>
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200/80">
          {t.empty}
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => {
            const isActive = item.id === activeId;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isActive
                      ? "border-white/20 bg-gradient-to-r from-violet-500/20 via-white/5 to-blue-500/20 text-slate-100"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-sm font-medium leading-6 text-slate-100">
                    {item.question}
                  </p>

                  <div className={`mt-2 text-xs ${isActive ? "text-slate-200/80" : "text-slate-300/70"}`}>
                    <p>
                      {t.audience}: {item.audience}
                    </p>
                    <p>
                      {t.saved}: {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {item.context ? (
                    <p
                      className={`mt-2 line-clamp-2 text-xs leading-5 ${
                        isActive ? "text-slate-200/80" : "text-slate-200/70"
                      }`}
                    >
                      {item.context}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
