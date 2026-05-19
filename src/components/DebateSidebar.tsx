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
          title: "Biblioteca",
          subtitle: "Disputas recientes",
          empty: "Sin debates todavia.",
          refresh: "Actualizar",
          close: "Cerrar",
        }
      : {
          title: "Library",
          subtitle: "Recent disputations",
          empty: "No debates yet.",
          refresh: "Refresh",
          close: "Close",
        };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        id="debate-sidebar"
        className={[
          "flex flex-shrink-0 flex-col overflow-hidden bg-[var(--surface)]",
          "border-[var(--border)] transition-[width,transform] duration-300 ease-in-out",
          // Mobile: fixed overlay, always 19rem wide, slide in/out
          "fixed left-0 top-0 z-40 h-full shadow-[var(--shadow-soft)]",
          // Desktop: static in flex row, no shadow, width-based open/close
          "lg:static lg:z-auto lg:h-auto lg:shadow-none lg:translate-x-0",
          open
            ? "w-[17rem] translate-x-0 border-r"
            : "w-[17rem] -translate-x-full lg:w-0 lg:border-r-0",
        ].join(" ")}
      >
        <div className="border-b border-[var(--border)] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-semibold leading-5 text-[var(--foreground)]">{t.title}</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-1">
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  aria-label={t.refresh}
                  className="rounded-md border border-transparent p-1.5 text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="rounded-md border border-transparent p-1.5 text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="scholarly-scrollbar flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-2.5">
                  <div className="h-3 w-4/5 rounded bg-[var(--surface-strong)]" />
                  <div className="mt-2 h-2 w-2/5 rounded bg-[var(--surface-strong)]" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <p className="py-6 text-center text-xs text-[var(--muted)]">{t.empty}</p>
          )}

          {!isLoading && items.length > 0 && (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition hover:border-[var(--border)] hover:bg-[var(--surface-muted)]"
                  >
                    <p className="line-clamp-2 text-xs font-medium leading-4 text-[var(--foreground)]">{item.question}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{formatDate(item.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--border)]">
          <BuyMeACoffeeButton />
        </div>
      </aside>
    </>
  );
}
