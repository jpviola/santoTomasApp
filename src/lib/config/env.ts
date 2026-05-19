import { z } from "zod";

const RawEnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().optional(),
  OPENAI_FALLBACK_MODEL: z.string().optional(),
  OPENROUTER_FALLBACK_MODEL: z.string().optional(),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_APP_NAME: z.string().optional(),
  GRAPHDB_ENDPOINT_URL: z.string().optional(),
  NEXT_PUBLIC_KOFI_ID: z.string().optional(),
  NEXT_PUBLIC_KOFI_ENABLED: z.string().optional(),
});

const ResolvedEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY or OPENROUTER_API_KEY is required"),
  OPENAI_MODEL: z.string().default("qwen/qwen3.5-9b"),
  OPENAI_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENAI_FALLBACK_MODEL: z.string().default("openai/gpt-4o-mini-2024-07-18"),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_APP_NAME: z.string().optional(),
  GRAPHDB_ENDPOINT_URL: z.string().default("http://localhost:7200/repositories/santoTomas"),
  NEXT_PUBLIC_KOFI_ID: z.string().optional(),
  NEXT_PUBLIC_KOFI_ENABLED: z.boolean().default(true),
});

export type Env = z.infer<typeof ResolvedEnvSchema>;

let cached: Env | null = null;

export const getEnv = (): Env => {
  if (cached) {
    return cached;
  }

  const raw = RawEnvSchema.parse(process.env);

  const resolved = {
    OPENAI_API_KEY: raw.OPENAI_API_KEY ?? raw.OPENROUTER_API_KEY,
    OPENAI_MODEL: raw.OPENAI_MODEL ?? raw.OPENROUTER_MODEL,
    OPENAI_BASE_URL: raw.OPENAI_BASE_URL ?? raw.OPENROUTER_BASE_URL,
    OPENAI_FALLBACK_MODEL: raw.OPENAI_FALLBACK_MODEL ?? raw.OPENROUTER_FALLBACK_MODEL,
    OPENROUTER_SITE_URL: raw.OPENROUTER_SITE_URL,
    OPENROUTER_APP_NAME: raw.OPENROUTER_APP_NAME,
    GRAPHDB_ENDPOINT_URL: raw.GRAPHDB_ENDPOINT_URL,
    NEXT_PUBLIC_KOFI_ID: raw.NEXT_PUBLIC_KOFI_ID,
    NEXT_PUBLIC_KOFI_ENABLED: raw.NEXT_PUBLIC_KOFI_ENABLED === "true" || raw.NEXT_PUBLIC_KOFI_ENABLED === "1",
  };

  const parsed = ResolvedEnvSchema.safeParse(resolved);

  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    console.error("Invalid environment variables:", JSON.stringify(details, null, 2));
    throw new Error(`Invalid environment variables: ${Object.keys(details).join(", ")}. Set OPENAI_API_KEY or OPENROUTER_API_KEY in your deployment settings.`);
  }

  cached = parsed.data;
  return cached;
};
