import { getEnv } from "@/lib/config/env";
import { getOpenAI } from "@/lib/llm/client";
import { LlmProviderError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type StreamChatParams = {
  systemPrompt: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  operationName?: string;
};

/**
 * Conversación en streaming. Si el modelo principal falla antes de emitir texto,
 * se reintenta con el modelo de respaldo; una vez empezada la respuesta no hay
 * vuelta atrás, así que un error a mitad de camino se propaga.
 */
export async function* streamChat({
  systemPrompt,
  messages,
  temperature = 0.5,
  maxTokens = 900,
  operationName = "stream-chat",
}: StreamChatParams): AsyncGenerator<string> {
  const env = getEnv();
  const models = [...new Set([env.OPENAI_MODEL, env.OPENAI_FALLBACK_MODEL].filter(Boolean))];
  let lastError: unknown = null;

  for (const model of models) {
    let started = false;
    try {
      const stream = await getOpenAI().chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          started = true;
          yield delta;
        }
      }

      if (started) return;
      lastError = new LlmProviderError("Model returned an empty response.", { operationName, model });
    } catch (error) {
      if (started) throw error;
      lastError = error;
      logger.warn("Streaming chat failed, trying next model", {
        operationName,
        model,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw lastError instanceof LlmProviderError
    ? lastError
    : new LlmProviderError("LLM provider request failed.", {
        operationName,
        originalError: lastError instanceof Error ? lastError.message : String(lastError),
      });
}
