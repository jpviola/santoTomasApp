"use client";

import Link from "next/link";
import type { Curriculum } from "@/lib/learning/types";
import type { LessonProgress } from "@/app/learn/LearnContext";

type CurriculumNavProps = {
  curriculum: Curriculum;
  activeLessonId?: string;
  lessons: Record<string, LessonProgress>;
  language: "es" | "en";
  open: boolean;
  onClose: () => void;
};

export function CheckIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 01.006 1.414l-7.25 7.3a1 1 0 01-1.42 0l-3.75-3.775a1 1 0 111.42-1.408l3.04 3.06 6.54-6.585a1 1 0 011.414-.006z" clipRule="evenodd" />
    </svg>
  );
}

export default function CurriculumNav({ curriculum, activeLessonId, lessons, language, open, onClose }: CurriculumNavProps) {
  const total = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
  const done = curriculum.reduce((sum, m) => sum + m.lessons.filter((l) => lessons[l.id]?.completedAt).length, 0);
  const t =
    language === "es"
      ? { title: "Itinerario", overview: "Vista general", close: "Cerrar", progress: `${done} de ${total} lecciones` }
      : { title: "Learning path", overview: "Overview", close: "Close", progress: `${done} of ${total} lessons` };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        id="curriculum-nav"
        className={[
          "flex flex-shrink-0 flex-col overflow-hidden bg-[var(--surface)]",
          "border-[var(--border)] transition-[width,transform] duration-300 ease-in-out",
          "fixed left-0 top-0 z-40 h-full shadow-[var(--shadow-soft)]",
          "lg:static lg:z-auto lg:h-auto lg:shadow-none lg:translate-x-0",
          open ? "w-[18rem] translate-x-0 border-r" : "w-[18rem] -translate-x-full lg:w-0 lg:border-r-0",
        ].join(" ")}
      >
        <div className="border-b border-[var(--border)] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg font-semibold leading-5 text-[var(--foreground)]">{t.title}</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.progress}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--surface-strong)]" aria-hidden="true">
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
              </div>
            </div>
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

        <nav className="scholarly-scrollbar flex-1 overflow-y-auto p-2" aria-label={t.title}>
          <Link
            href="/learn"
            onClick={onClose}
            aria-current={!activeLessonId ? "page" : undefined}
            className={`mb-2 block rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              !activeLessonId
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.overview}
          </Link>
          <ol className="space-y-3">
            {curriculum.map((module, moduleIndex) => (
              <li key={module.id}>
                <p className="px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {moduleIndex + 1}. {module.title}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {module.lessons.map((lesson) => {
                    const active = lesson.id === activeLessonId;
                    const completed = Boolean(lessons[lesson.id]?.completedAt);
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/learn/${lesson.id}`}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-[1.35] transition ${
                            active
                              ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                              : "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              completed
                                ? "border-[var(--olive)] bg-[var(--olive)] text-[var(--surface)]"
                                : "border-[var(--border-strong)]"
                            }`}
                          >
                            {completed && <CheckIcon className="h-2.5 w-2.5" />}
                          </span>
                          <span className="min-w-0">{lesson.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </>
  );
}
