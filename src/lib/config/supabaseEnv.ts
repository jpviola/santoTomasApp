import { z } from "zod";

const SupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof SupabaseEnvSchema>;

let cached: SupabaseEnv | null = null;

export const tryGetSupabaseEnv = (): SupabaseEnv | null => {
  try {
    return getSupabaseEnv();
  } catch {
    return null;
  }
};

export const getSupabaseEnv = (): SupabaseEnv => {
  if (cached) return cached;

  const parsed = SupabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.DNEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_KEY,
  });

  if (!parsed.success) {
    throw new Error("Missing Supabase environment variables.");
  }

  cached = parsed.data;
  return cached;
};
