import { z } from "zod";

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("qwen/qwen3.5-9b"),
  OPENAI_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENAI_FALLBACK_MODEL: z.string().default("openai/gpt-4o-mini-2024-07-18"),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_APP_NAME: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export const getEnv = (): Env => {
  if (cached) {
    return cached;
  }

  const parsed = EnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? process.env.OPENROUTER_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? process.env.OPENROUTER_BASE_URL,
    OPENAI_FALLBACK_MODEL: process.env.OPENAI_FALLBACK_MODEL ?? process.env.OPENROUTER_FALLBACK_MODEL,
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
    OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME,
  });

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables.");
  }

  cached = parsed.data;
  return cached;
};
