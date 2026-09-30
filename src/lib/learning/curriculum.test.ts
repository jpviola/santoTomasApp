import { describe, expect, it } from "vitest";
import { curriculumEn } from "@/data/learning/en";
import { curriculumEs } from "@/data/learning/es";
import { getCorpusEntry } from "@/lib/retrieval/aquinasRetriever";
import { findLesson, getLessonIds } from "@/lib/learning/curriculum";

const lessonsOf = (curriculum: typeof curriculumEs) => curriculum.flatMap((m) => m.lessons);

describe("curriculum", () => {
  it("has the same modules and lessons, in the same order, in both languages", () => {
    expect(curriculumEn.map((m) => m.id)).toEqual(curriculumEs.map((m) => m.id));
    expect(lessonsOf(curriculumEn).map((l) => l.id)).toEqual(lessonsOf(curriculumEs).map((l) => l.id));
  });

  it("has unique lesson ids", () => {
    const ids = getLessonIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps quizzes, glossaries and primary texts structurally identical across languages", () => {
    const en = lessonsOf(curriculumEn);
    lessonsOf(curriculumEs).forEach((es, i) => {
      const other = en[i];
      expect(other.quiz.map((q) => [q.options.length, q.answer])).toEqual(es.quiz.map((q) => [q.options.length, q.answer]));
      expect(other.glossary.length).toBe(es.glossary.length);
      expect(other.keyIdeas.length).toBe(es.keyIdeas.length);
      expect(other.primaryText?.sourceId).toBe(es.primaryText?.sourceId);
      expect(other.primaryText?.latin).toBe(es.primaryText?.latin);
    });
  });

  it("gives every lesson a body, a quiz with valid answers and prompts for the tutor and the disputation", () => {
    for (const lesson of [...lessonsOf(curriculumEs), ...lessonsOf(curriculumEn)]) {
      expect(lesson.body.length).toBeGreaterThanOrEqual(3);
      expect(lesson.quiz.length).toBeGreaterThanOrEqual(3);
      for (const q of lesson.quiz) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
      expect(lesson.askAquinas.length).toBeGreaterThan(0);
      expect(lesson.tutorStarters.length).toBeGreaterThan(0);
    }
  });

  it("points every primary text at an existing corpus entry", () => {
    for (const lesson of lessonsOf(curriculumEs)) {
      if (lesson.primaryText) {
        expect(getCorpusEntry(lesson.primaryText.sourceId), lesson.id).toBeDefined();
      }
    }
  });

  it("locates a lesson with its module and neighbours", () => {
    const first = findLesson("vida", "es");
    expect(first?.index).toBe(0);
    expect(first?.previous).toBeUndefined();
    expect(first?.next?.id).toBe("siglo-xiii");

    const naturalLaw = findLesson("ley-natural", "en");
    expect(naturalLaw?.module.id).toBe("etica");
    expect(naturalLaw?.lesson.title).toBe("Natural law");

    expect(findLesson("does-not-exist", "es")).toBeNull();
  });
});
