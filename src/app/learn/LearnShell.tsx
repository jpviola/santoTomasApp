"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import CurriculumNav from "@/components/learn/CurriculumNav";
import ModeNav from "@/components/ModeNav";
import ThemeToggle from "@/components/ThemeToggle";
import { getCurriculum } from "@/lib/learning/curriculum";
import { LearnProvider, useLearn } from "@/app/learn/LearnContext";

function Shell({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, progress } = useLearn();
  const params = useParams<{ lessonId?: string }>();
  const activeLessonId = params?.lessonId;
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setNavOpen(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t =
    language === "es"
      ? { menu: "Abrir índice", title: "Santo Tomás App", subtitle: "Aprender con Santo Tomás", interfaceLanguage: "Cambiar idioma de la interfaz" }
      : { menu: "Open contents", title: "Santo Tomás App", subtitle: "Learn with St. Thomas", interfaceLanguage: "Switch interface language" };

  return (
    <main id="main-content" className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <CurriculumNav
        curriculum={getCurriculum(language)}
        activeLessonId={activeLessonId}
        lessons={progress.lessons}
        language={language}
        open={navOpen}
        onClose={() => {
          if (!window.matchMedia("(min-width: 1024px)").matches) setNavOpen(false);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[52px] items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-2.5 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={t.menu}
              aria-expanded={navOpen}
              aria-controls="curriculum-nav"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h7a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-white p-1">
              <Image src="/santotomas_logo_vector.png" alt="" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-base font-semibold leading-5 text-[var(--foreground)] sm:text-[17px]">{t.title}</p>
              <p className="hidden truncate text-xs text-[var(--muted)] sm:block">{t.subtitle}</p>
            </div>
            <ModeNav active="learn" language={language} className="ml-2 hidden md:flex" />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              aria-label={t.interfaceLanguage}
              title={t.interfaceLanguage}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
            >
              {language === "es" ? "ES" : "EN"}
            </button>
            <ThemeToggle className="h-8 w-8 shrink-0" />
          </div>
        </header>
        <div className="flex justify-center border-b border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 md:hidden">
          <ModeNav active="learn" language={language} />
        </div>

        <div id="learn-scroll" className="scholarly-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-7">
          {children}
        </div>
      </div>
    </main>
  );
}

export default function LearnShell({ children }: { children: React.ReactNode }) {
  return (
    <LearnProvider>
      <Shell>{children}</Shell>
    </LearnProvider>
  );
}
