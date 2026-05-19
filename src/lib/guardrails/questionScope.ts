import { ValidationError } from "@/lib/utils/errors";

type GuardrailLanguage = "en" | "es" | "la";

type ScopeDecision = {
  allowed: boolean;
  message?: string;
  code?: "OUT_OF_SCOPE_QUESTION";
};

const IN_SCOPE_PATTERNS = [
  /\b(tom[aá]s|aquinas|tomista|thomistic|thomas|summa|escol[aá]stic|scholastic)\b/i,
  /\b(dios|god|fe|faith|raz[oó]n|reason|alma|soul|virtud|virtue|pecado|sin)\b/i,
  /\b(gracia|grace|ley natural|natural law|bien com[uú]n|common good|justicia|justice)\b/i,
  /\b(metaf[ií]sica|metaphysics|ética|ethics|moral|teolog[ií]a|theology|filosof[ií]a|philosophy)\b/i,
  /\b(verdad|truth|felicidad|happiness|beatitud|beatitude|libertad|freedom|voluntad|will)\b/i,
  /\b(eucarist[ií]a|eucharist|trinidad|trinity|cristo|christ|iglesia|church|sacramento|sacrament)\b/i,
  /\b(ens|esse|actus|potentia|causa|causality|bonum|veritas|anima)\b/i,
];

const OUT_OF_SCOPE_PATTERNS = [
  /\b(clima|weather|temperatura|temperature|pron[oó]stico|forecast)\b/i,
  /\b(partido|score|resultado|fixture|sports?|nba|nfl|mlb|f[uú]tbol|soccer)\b/i,
  /\b(precio|stock|crypto|bitcoin|acciones|invertir|investment|portfolio|trading)\b/i,
  /\b(receta|recipe|cocinar|cook|ingredientes|ingredients)\b/i,
  /\b(vuelo|flight|hotel|restaurante|restaurant|turismo|travel)\b/i,
  /\b(c[oó]digo|code|programa|programming|javascript|typescript|python|sql|bug|deploy)\b/i,
  /\b(curriculum|resume|cv|entrevista laboral|job interview|email marketing)\b/i,
  /\b(diagn[oó]stico m[eé]dico|medical diagnosis|síntomas|symptoms|medicamento|dosage)\b/i,
];

function getOutOfScopeMessage(language: GuardrailLanguage) {
  if (language === "en") {
    return "This app is focused on scholastic, philosophical, and theological questions inspired by Thomas Aquinas. Please reformulate your question within that scope.";
  }

  if (language === "la") {
    return "Haec applicatio ad quaestiones scholasticas, philosophicas et theologicas secundum Thomam Aquinatem ordinatur. Quaestionem intra hunc ambitum, quaeso, reformula.";
  }

  return "Esta app está pensada para cuestiones escolásticas, filosóficas y teológicas inspiradas en Santo Tomás. Reformulá la pregunta dentro de ese ámbito.";
}

export function assessQuestionScope(question: string, language: GuardrailLanguage = "es"): ScopeDecision {
  const normalized = question.trim();
  if (!normalized) {
    return { allowed: true };
  }

  const inScope = IN_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized));
  if (inScope) {
    return { allowed: true };
  }

  const clearlyOutOfScope = OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized));
  if (!clearlyOutOfScope) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "OUT_OF_SCOPE_QUESTION",
    message: getOutOfScopeMessage(language),
  };
}

export function assertQuestionInScope(question: string, language: GuardrailLanguage = "es") {
  const decision = assessQuestionScope(question, language);
  if (!decision.allowed) {
    throw new ValidationError(decision.message ?? getOutOfScopeMessage(language), {
      code: decision.code,
      question,
    });
  }
}
