"use client";

import type { DebateHistoryItem } from "@/types/history";

type DebateHistoryListProps = {
  items: DebateHistoryItem[];
  activeId?: string | null;
  isLoading?: boolean;
  error?: string | null;
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
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t.title}</h2>
          <p className="text-xs text-slate-500">{t.subtitle}</p>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={() => onRefresh()}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.refresh}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-slate-200 p-3">
              <div className="h-4 w-5/6 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">{t.loadingErrorTitle}</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
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
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isActive ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className={`text-sm font-medium leading-6 ${isActive ? "text-white" : "text-slate-900"}`}>
                    {item.question}
                  </p>

                  <div className={`mt-2 text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                    <p>
                      {t.audience}: {item.audience}
                    </p>
                    <p>
                      {t.saved}: {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {item.context ? (
                    <p className={`mt-2 line-clamp-2 text-xs leading-5 ${isActive ? "text-slate-200" : "text-slate-600"}`}>
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
