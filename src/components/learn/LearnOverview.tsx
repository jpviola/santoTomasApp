"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckIcon } from "@/components/learn/CurriculumNav";
import { findLesson, getCurriculum } from "@/lib/learning/curriculum";
import { useLearn } from "@/app/learn/LearnContext";

export default function LearnOverview() {
  const { language, progress, resetProgress } = useLearn();
  const curriculum = getCurriculum(language);
  const allLessons = curriculum.flatMap((m) => m.lessons);
  const done = allLessons.filter((l) => progress.lessons[l.id]?.completedAt).length;
  const resume = progress.lastLessonId ? findLesson(progress.lastLessonId, language)?.lesson : undefined;
  const firstPending = allLessons.find((l) => !progress.lessons[l.id]?.completedAt);
  const target = resume && !progress.lessons[resume.id]?.completedAt ? resume : firstPending ?? allLessons[0];
  const started = done > 0 || Boolean(progress.lastLessonId);

  const t =
    language === "es"
      ? {
          eyebrow: "Itinerario",
          title: "Aprender con Tomás de Aquino",
          copy: "Diecinueve lecciones breves, del siglo XIII a la ética y la política. Cada una trae un texto de Tomás, un repaso y un tutor con quien conversar; al final podés llevar cada tema al modo disputa.",
          start: "Empezar por la primera lección",
          resume: `Continuar: ${target.title}`,
          progress: `${done} de ${allLessons.length} lecciones completadas`,
          steps: [
            ["Leé", "Una lección breve con las ideas clave y el vocabulario."],
            ["Repasá", "Un quiz con explicaciones y el texto real de Tomás."],
            ["Conversá", "Un tutor que responde tus dudas y te hace pensar."],
            ["Disputá", "Llevá la cuestión al modo disputa y escuchá a Tomás."],
          ],
          lessons: "lecciones",
          minutes: "min",
          reset: "Reiniciar progreso",
          resetConfirm: "¿Borrar todo tu progreso del itinerario?",
        }
      : {
          eyebrow: "Learning path",
          title: "Learn with Thomas Aquinas",
          copy: "Nineteen short lessons, from the thirteenth century to ethics and politics. Each comes with a text by Thomas, a review and a tutor to talk to; at the end you can take each topic to disputation mode.",
          start: "Start with the first lesson",
          resume: `Continue: ${target.title}`,
          progress: `${done} of ${allLessons.length} lessons completed`,
          steps: [
            ["Read", "A short lesson with the key ideas and vocabulary."],
            ["Review", "A quiz with explanations and Thomas's actual text."],
            ["Talk", "A tutor who answers your questions and makes you think."],
            ["Dispute", "Take the question to disputation mode and hear Thomas out."],
          ],
          lessons: "lessons",
          minutes: "min",
          reset: "Reset progress",
          resetConfirm: "Erase all your learning path progress?",
        };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <section className="grid gap-5 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:grid-cols-[140px_minmax(0,1fr)] sm:p-7">
        <div className="relative aspect-[3/1] overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] sm:aspect-[4/5]">
          <Image src="/aquinas-banner.webp" alt="" fill sizes="(max-width: 640px) 100vw, 140px" className="object-cover object-[18%_50%]" priority />
        </div>
        <div className="flex flex-col justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">{t.eyebrow}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight text-[var(--foreground)]">{t.title}</h1>
          <p className="mt-3 font-serif text-[16px] leading-relaxed text-[var(--muted-strong)]">{t.copy}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/learn/${target.id}`}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--surface)] transition hover:opacity-90"
            >
              {started ? t.resume : t.start}
            </Link>
            {started && (
              <div className="min-w-[180px] flex-1">
                <p className="text-xs text-[var(--muted)]">{t.progress}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]" aria-hidden="true">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(done / allLessons.length) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <ol className="grid gap-2 sm:grid-cols-4">
        {t.steps.map(([title, copy], i) => (
          <li key={title} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <p className="font-serif text-[15px] font-semibold text-[var(--foreground)]">
              <span className="mr-1.5 font-mono text-xs text-[var(--accent)]">{i + 1}</span>
              {title}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-[var(--muted-strong)]">{copy}</p>
          </li>
        ))}
      </ol>

      <ol className="space-y-4">
        {curriculum.map((module, moduleIndex) => {
          const moduleDone = module.lessons.filter((l) => progress.lessons[l.id]?.completedAt).length;
          const moduleMinutes = module.lessons.reduce((sum, l) => sum + l.minutes, 0);
          return (
            <li key={module.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">
                  <span className="mr-2 font-mono text-sm text-[var(--accent)]">{moduleIndex + 1}</span>
                  {module.title}
                </h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
                  {moduleDone}/{module.lessons.length} {t.lessons} · {moduleMinutes} {t.minutes}
                </p>
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted-strong)]">{module.description}</p>
              <ul className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {module.lessons.map((lesson) => {
                  const completed = Boolean(progress.lessons[lesson.id]?.completedAt);
                  return (
                    <li key={lesson.id}>
                      <Link href={`/learn/${lesson.id}`} className="group flex items-start gap-3 py-2.5">
                        <span
                          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            completed ? "border-[var(--olive)] bg-[var(--olive)] text-[var(--surface)]" : "border-[var(--border-strong)]"
                          }`}
                        >
                          {completed && <CheckIcon className="h-2.5 w-2.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-serif text-[16px] font-semibold text-[var(--muted-strong)] group-hover:text-[var(--foreground)]">
                            {lesson.title}
                          </span>
                          <span className="block text-[13px] leading-snug text-[var(--muted)]">{lesson.summary}</span>
                        </span>
                        <span className="mt-1 shrink-0 font-mono text-[10px] text-[var(--muted)]">
                          {lesson.minutes} {t.minutes}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {started && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t.resetConfirm)) resetProgress();
            }}
            className="text-xs text-[var(--muted)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--foreground)]"
          >
            {t.reset}
          </button>
        </div>
      )}
    </div>
  );
}
