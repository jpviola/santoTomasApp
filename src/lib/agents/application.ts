import { callModel } from "@/lib/llm/callModel";
import type { Agent, AgentContext } from "@/lib/agents/types";
import { logger } from "@/lib/utils/logger";

export const createApplicationAgent = (name = "Application"): Agent => {
  return {
    name,
    stage: "application",
    async generate(ctx: AgentContext) {
      const { audience, question } = ctx.input;
      const language = ctx.language;
      const isSpanish = language === "es";

      // Instrucciones específicas según la audiencia para guiar al LLM
      const audienceInstructions = {
        seminary: isSpanish
          ? "Enfoque: Formación pastoral, espiritualidad sacerdotal, catequesis y virtudes morales e intelectuales."
          : "Focus: Pastoral formation, priestly spirituality, catechesis, and moral/intellectual virtues.",
        graduate: isSpanish
          ? "Enfoque: Rigor académico, implicaciones éticas en la investigación, metodología y diálogo interdisciplinar."
          : "Focus: Academic rigor, ethical implications in research, methodology, and interdisciplinary dialogue.",
        undergraduate: isSpanish
          ? "Enfoque: Claridad pedagógica, aplicaciones en la vida cotidiana, discernimiento práctico y toma de decisiones."
          : "Focus: Pedagogical clarity, everyday life applications, practical discernment, and decision-making.",
      };

      const systemPrompt = isSpanish
        ? `Eres un experto en praxis tomista. Tu misión es cerrar una disputa escolástica proponiendo una "Aplicación" práctica.
           Debes tomar las conclusiones de la disputa sobre la cuestión "${question}" y traducirlas en pasos concretos.
           ${audienceInstructions[audience as keyof typeof audienceInstructions]}
           Estructura tu respuesta con puntos claros y una breve exhortación final. Mantén un tono elevado pero sumamente práctico.`
        : `You are an expert in Thomistic praxis. Your mission is to close a scholastic disputation by proposing a practical "Application".
           You must take the conclusions of the dispute regarding the question "${question}" and translate them into concrete steps.
           ${audienceInstructions[audience as keyof typeof audienceInstructions]}
           Structure your response with clear bullet points and a brief final exhortation. Maintain an elevated yet highly practical tone.`;

      const userPrompt = isSpanish
        ? `Genera la aplicación para una audiencia de tipo: ${audience}. 
           La aplicación debe ser coherente con el pensamiento de Santo Tomás de Aquino y responder a la realidad de la pregunta: "${question}".`
        : `Generate the application for an audience of type: ${audience}. 
           The application must be consistent with the thought of Thomas Aquinas and respond to the reality of the question: "${question}".`;

      try {
        const response = await callModel({
          systemPrompt,
          userPrompt,
          temperature: 0.7, // Un poco más de creatividad para la parte práctica
          operationName: "application-agent-llm-call",
        });

        return response;
      } catch (error) {
        logger.error("Error in Application Agent dynamic generation", { error });
        
        // Fallback elegante por si falla el modelo
        return isSpanish
          ? `Basado en la disputa sobre "${question}", se recomienda a la audiencia (${audience}) proceder con prudencia, 
             estudiando las fuentes citadas y aplicando el discernimiento racional en su contexto particular.`
          : `Based on the disputation about "${question}", it is recommended that the audience (${audience}) proceed with prudence, 
             studying the cited sources and applying rational discernment in their particular context.`;
      }
    },
  };
};
