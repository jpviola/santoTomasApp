import type { Agent } from "@/lib/agents/types";
import type { AgentContext } from "@/lib/agents/types";

export const application = (ctx: AgentContext): string => {
  const a = ctx.input.audience;
  const q = ctx.input.question;

  if (ctx.language === "es") {
    const steps =
      a === "seminary"
        ? [
            "Aplicación: elaborar un esquema catequético (definiciones, virtudes, riesgos).",
            "Diseñar un caso pastoral y un examen de conciencia intelectual (humildad, prudencia).",
            "Definir una práctica semanal: lectura guiada + discusión + revisión de decisiones.",
          ]
        : a === "graduate"
          ? [
              "Aplicación: definir hipótesis y métricas; preparar un piloto con grupo control si es posible.",
              "Registrar supuestos y riesgos; pre-registrar criterios de éxito/fracaso.",
              "Iterar con datos y revisión por pares.",
            ]
          : [
              "Aplicación: elegir un caso concreto y definir éxito en una frase medible.",
              "Probar un piloto corto (2–4 semanas) y recoger retroalimentación.",
              "Ajustar o abandonar según resultados.",
            ];

    return [`Aplicación a “${q}”:`, ...steps].join("\n");
  }

  const steps =
    a === "seminary"
      ? [
          "Application: draft a formative outline (definitions, virtues, risks).",
          "Design a pastoral case and an examination of intellectual conscience (humility, prudence).",
          "Set a weekly practice: guided reading + discussion + decision review.",
        ]
      : a === "graduate"
        ? [
            "Application: define hypotheses and metrics; prepare a pilot with a control group if possible.",
            "Log assumptions and risks; pre-register success/failure criteria.",
            "Iterate with data and peer review.",
          ]
        : [
            "Application: pick a concrete case and define success in one measurable sentence.",
            "Run a short pilot (2–4 weeks) and collect feedback.",
            "Adjust or stop based on results.",
          ];

  return [`Application to “${q}”:`, ...steps].join("\n");
};

export const createApplicationAgent = (name = "Application"): Agent => {
  return {
    name,
    stage: "application",
    async generate(ctx) {
      return application(ctx);
    },
  };
};
