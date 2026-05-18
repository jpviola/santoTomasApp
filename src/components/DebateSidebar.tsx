"use client";

import type { DebateHistoryItem } from "@/types/history";
import BuyMeACoffeeButton from "@/components/BuyMeACoffeeButton";

type DebateSidebarProps = {
  items: DebateHistoryItem[];
  isLoading: boolean;
  onSelect: (id: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  language: "es" | "en";
  open: boolean;
  onClose: () => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function DebateSidebar({
  items,
  isLoading,
  onSelect,
  onRefresh,
  language,
  open,
  onClose,
}: DebateSidebarProps) {
  const t =
    language === "es"
      ? {
          title: "Historial",
          empty: "Sin debates aún.",
          refresh: "Actualizar",
        }
      : {
          title: "History",
          empty: "No debates yet.",
          refresh: "Refresh",
        };

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-30 bg-blue-950/40 backdrop-blur-sm" onClick={onClose} />}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/10 bg-slate-900/95 backdrop-blur transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">{t.title}</h2>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-md p-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg bg-white/5 p-3">
                  <div className="h-3 w-4/5 rounded bg-white/10" />
                  <div className="mt-2 h-2 w-2/5 rounded bg-white/5" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">{t.empty}</p>
          )}

          {!isLoading && items.length > 0 && (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(item.id); onClose(); }}
                    className="w-full rounded-lg border border-transparent p-3 text-left transition hover:border-white/10 hover:bg-white/5"
                  >
                    <p className="line-clamp-2 text-sm text-slate-200">{item.question}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10">
          <BuyMeACoffeeButton />
        </div>
      </aside>
    </>
  );
}
