"use client";

import { useEffect } from "react";
import Link from "next/link";
import LessonQuiz from "@/components/learn/LessonQuiz";
import PrimaryTextCard from "@/components/learn/PrimaryTextCard";
import TutorChat from "@/components/learn/TutorChat";
import { CheckIcon } from "@/components/learn/CurriculumNav";
import { countLessons, findLesson, getCurriculum } from "@/lib/learning/curriculum";
import { useLearn } from "@/app/learn/LearnContext";

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-xl font-semibold leading-tight text-[var(--foreground)]">{title}</h2>
    </div>
  );
}

export default function LessonView({ lessonId }: { lessonId: string }) {
  const { language, progress, markVisited, setCompleted, recordQuiz } = useLearn();
  const location = findLesson(lessonId, language);

  useEffect(() => {
    markVisited(lessonId);
    document.getElementById("learn-scroll")?.scrollTo({ top: 0 });
  }, [lessonId, markVisited]);

  if (!location) return null;
  const { lesson, module, index, previous, next } = location;
  const moduleNumber = getCurriculum(language).findIndex((m) => m.id === module.id) + 1;
  const lessonProgress = progress.lessons[lesson.id];
  const completed = Boolean(lessonProgress?.completedAt);

  const t =
    language === "es"
      ? {
          module: `Módulo ${moduleNumber} · ${module.title}`,
          position: `Lección ${index + 1} de ${countLessons()}`,
          minutes: `${lesson.minutes} min de lectura`,
          keyIdeas: "Ideas clave",
          keyIdeasEyebrow: "In summa",
          source: "Texto fuente",
          sourceEyebrow: "Lectio",
          glossary: "Glosario",
          glossaryEyebrow: "Vocabula",
          quiz: "Repaso",
          quizEyebrow: "Examen",
          dispute: "Disputá con Tomás",
          disputeEyebrow: "Quaestio",
          disputeCopy: "Llevá lo aprendido al modo disputa: Tomás responde con objeciones, sed contra, respondeo y réplicas.",
          previous: "Anterior",
          next: "Siguiente",
          complete: "Marcar como completada",
          completed: "Completada",
          overview: "Volver al itinerario",
        }
      : {
          module: `Module ${moduleNumber} · ${module.title}`,
          position: `Lesson ${index + 1} of ${countLessons()}`,
          minutes: `${lesson.minutes} min read`,
          keyIdeas: "Key ideas",
          keyIdeasEyebrow: "In summa",
          source: "Primary text",
          sourceEyebrow: "Lectio",
          glossary: "Glossary",
          glossaryEyebrow: "Vocabula",
          quiz: "Review",
          quizEyebrow: "Examen",
          dispute: "Dispute with Thomas",
          disputeEyebrow: "Quaestio",
          disputeCopy: "Take what you learned to disputation mode: Thomas answers with objections, sed contra, respondeo and replies.",
          previous: "Previous",
          next: "Next",
          complete: "Mark as completed",
          completed: "Completed",
          overview: "Back to the learning path",
        };

  return (
    <div className="mx-auto max-w-6xl pb-10 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
      <article className="min-w-0">
        <header className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 shadow-[var(--shadow-soft)] sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{t.module}</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">{lesson.title}</h1>
          <p className="mt-3 max-w-2xl font-serif text-[17px] leading-relaxed text-[var(--muted-strong)]">{lesson.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em]">
            <span className="rounded-full bg-[var(--surface-strong)] px-2.5 py-1 text-[var(--muted-strong)]">{t.position}</span>
            <span className="rounded-full bg-[var(--surface-strong)] px-2.5 py-1 text-[var(--muted-strong)]">{t.minutes}</span>
            {completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--olive)_14%,transparent)] px-2.5 py-1 text-[var(--olive)]">
                <CheckIcon /> {t.completed}
              </span>
            )}
          </div>
        </header>

        <div className="reading-prose mt-8 space-y-5 px-1 text-[18px] sm:px-2">
          {lesson.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <section className="mt-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] p-5 sm:p-6">
          <SectionHeading eyebrow={t.keyIdeasEyebrow} title={t.keyIdeas} />
          <ul className="space-y-2.5">
            {lesson.keyIdeas.map((idea) => (
              <li key={idea} className="flex gap-3 font-serif text-[16px] leading-relaxed text-[var(--foreground)]">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </section>

        {lesson.primaryText && (
          <section className="mt-10">
            <SectionHeading eyebrow={t.sourceEyebrow} title={t.source} />
            <PrimaryTextCard primaryText={lesson.primaryText} language={language} />
          </section>
        )}

        <section className="mt-10">
          <SectionHeading eyebrow={t.glossaryEyebrow} title={t.glossary} />
          <dl className="divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
            {lesson.glossary.map((item) => (
              <div key={item.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
                <dt className="font-serif text-[15px] font-semibold italic text-[var(--foreground)]">{item.term}</dt>
                <dd className="text-[14px] leading-relaxed text-[var(--muted-strong)]">{item.definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10">
          <SectionHeading eyebrow={t.quizEyebrow} title={t.quiz} />
          <LessonQuiz
            lessonId={lesson.id}
            items={lesson.quiz}
            language={language}
            previousResult={
              lessonProgress?.quizTotal ? { correct: lessonProgress.quizCorrect ?? 0, total: lessonProgress.quizTotal } : undefined
            }
            onComplete={(correct, total) => recordQuiz(lesson.id, correct, total)}
          />
        </section>

        <section className="mt-10">
          <SectionHeading eyebrow={t.disputeEyebrow} title={t.dispute} />
          <p className="mb-3 text-[14px] leading-relaxed text-[var(--muted-strong)]">{t.disputeCopy}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {lesson.askAquinas.map((question) => (
              <Link
                key={question}
                href={`/?q=${encodeURIComponent(question)}`}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 font-serif text-[15px] leading-snug text-[var(--muted-strong)] shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              >
                {question}
              </Link>
            ))}
          </div>
        </section>
      </article>

      <aside className="mt-10 xl:mt-0">
        <div className="xl:sticky xl:top-0">
          <TutorChat
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            starters={lesson.tutorStarters}
            language={language}
            className="h-[520px] xl:h-[calc(100vh-9rem)]"
          />
        </div>
      </aside>

      <nav
        aria-label={language === "es" ? "Navegación entre lecciones" : "Lesson navigation"}
        className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between xl:col-span-2"
      >
        <div className="flex-1">
          {previous ? (
            <Link href={`/learn/${previous.id}`} className="group block text-sm">
              <span className="block text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">← {t.previous}</span>
              <span className="font-serif font-semibold text-[var(--muted-strong)] group-hover:text-[var(--foreground)]">{previous.title}</span>
            </Link>
          ) : (
            <Link href="/learn" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              ← {t.overview}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCompleted(lesson.id, !completed)}
          aria-pressed={completed}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            completed
              ? "border border-[var(--olive)] text-[var(--olive)] hover:bg-[color-mix(in_srgb,var(--olive)_10%,transparent)]"
              : "bg-[var(--accent)] text-[var(--surface)] hover:opacity-90"
          }`}
        >
          {completed && <CheckIcon className="h-3.5 w-3.5" />}
          {completed ? t.completed : t.complete}
        </button>
        <div className="flex-1 sm:text-right">
          {next ? (
            <Link href={`/learn/${next.id}`} className="group block text-sm">
              <span className="block text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">{t.next} →</span>
              <span className="font-serif font-semibold text-[var(--muted-strong)] group-hover:text-[var(--foreground)]">{next.title}</span>
            </Link>
          ) : (
            <Link href="/learn" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              {t.overview} →
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
