import { curriculumEn } from "@/data/learning/en";
import { curriculumEs } from "@/data/learning/es";
import type { Curriculum, LearnLanguage, Lesson, LearningModule } from "@/lib/learning/types";

const CURRICULA: Record<LearnLanguage, Curriculum> = { es: curriculumEs, en: curriculumEn };

export function getCurriculum(language: LearnLanguage): Curriculum {
  return CURRICULA[language];
}

export type LessonLocation = {
  lesson: Lesson;
  module: LearningModule;
  /** Posición global de la lección en el itinerario (desde 0). */
  index: number;
  previous?: Lesson;
  next?: Lesson;
};

export function getLessonIds(): string[] {
  return curriculumEs.flatMap((m) => m.lessons.map((l) => l.id));
}

export function findLesson(lessonId: string, language: LearnLanguage): LessonLocation | null {
  const curriculum = getCurriculum(language);
  const flat = curriculum.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module })));
  const index = flat.findIndex((entry) => entry.lesson.id === lessonId);
  if (index < 0) return null;
  return {
    ...flat[index],
    index,
    previous: flat[index - 1]?.lesson,
    next: flat[index + 1]?.lesson,
  };
}

export function countLessons(): number {
  return getLessonIds().length;
}
