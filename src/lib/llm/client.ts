import OpenAI from "openai";
import { getEnv } from "@/lib/config/env";

let cached: OpenAI | null = null;

export const getOpenAI = (): OpenAI => {
  if (cached) {
    return cached;
  }

  const env = getEnv();
  const headers: Record<string, string> = {};
  if (env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = env.OPENROUTER_SITE_URL;
  }
  if (env.OPENROUTER_APP_NAME) {
    headers["X-Title"] = env.OPENROUTER_APP_NAME;
  }

  cached = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
    defaultHeaders: Object.keys(headers).length > 0 ? headers : undefined,
  });

  return cached;
};
