export type LearnLanguage = "es" | "en";

export type QuizItem = {
  question: string;
  options: string[];
  /** Índice de la opción correcta en `options`. */
  answer: number;
  explanation: string;
};

export type GlossaryItem = {
  term: string;
  definition: string;
};

export type PrimaryText = {
  /** Id de una entrada de src/data/corpus/aquinas-corpus.json; el texto real se descarga en vivo. */
  sourceId: string;
  /** Por qué leer este pasaje, en una o dos oraciones. */
  why: string;
  /** Fórmula latina célebre del pasaje, solo cuando es literal. */
  latin?: string;
};

export type Lesson = {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  /** Párrafos del cuerpo de la lección. */
  body: string[];
  keyIdeas: string[];
  glossary: GlossaryItem[];
  primaryText?: PrimaryText;
  quiz: QuizItem[];
  /** Cuestiones para abrir como disputa en el modo principal. */
  askAquinas: string[];
  /** Sugerencias para empezar a conversar con el tutor. */
  tutorStarters: string[];
};

export type LearningModule = {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
};

export type Curriculum = LearningModule[];
