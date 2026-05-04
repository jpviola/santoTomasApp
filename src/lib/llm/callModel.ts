import { getEnv } from "@/lib/config/env";
import { getOpenAI } from "@/lib/llm/client";
import { withRetry } from "@/lib/llm/withRetry";
import { logger } from "@/lib/utils/logger";
import { LlmProviderError } from "@/lib/utils/errors";

type CallModelParams = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  operationName?: string;
  maxTokens?: number;
};

const getStatusCode = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
};

const isRetryableStatus = (status: number | null): boolean => {
  if (status === null) {
    return true;
  }
  if (status === 429) {
    return true;
  }
  return status >= 500;
};

const callChatCompletion = async (params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  operationName: string;
}): Promise<string> => {
  try {
    const openai = getOpenAI();

    logger.debug("Calling model", {
      operationName: params.operationName,
      model: params.model,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    const response = await openai.chat.completions.create({
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();

    if (!text) {
      throw new LlmProviderError("Model returned an empty response.", {
        operationName: params.operationName,
        model: params.model,
      });
    }

    return text;
  } catch (error) {
    if (error instanceof LlmProviderError) {
      throw error;
    }

    const status = getStatusCode(error);
    const retryable = isRetryableStatus(status);

    throw new LlmProviderError(
      "LLM provider request failed.",
      {
        operationName: params.operationName,
        model: params.model,
        status,
        originalError: error instanceof Error ? error.message : String(error),
      },
      retryable,
    );
  }
};

export async function callModel({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  operationName = "call-model",
  maxTokens = 900,
}: CallModelParams): Promise<string> {
  const env = getEnv();

  const attempt = async (model: string, op: string) => {
    return withRetry(
      async () =>
        callChatCompletion({
          model,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          operationName: op,
        }),
      {
        operationName: op,
        maxAttempts: 3,
        initialDelayMs: 500,
        backoffMultiplier: 2,
        shouldRetry: (error) => error instanceof LlmProviderError && error.retryable,
      },
    );
  };

  try {
    return await attempt(env.OPENAI_MODEL, operationName);
  } catch (error) {
    if (!(error instanceof LlmProviderError) || !error.retryable) {
      throw error;
    }

    const fallback = env.OPENAI_FALLBACK_MODEL;
    if (!fallback || fallback === env.OPENAI_MODEL) {
      throw error;
    }

    return attempt(fallback, `${operationName}-fallback`);
  }
}
