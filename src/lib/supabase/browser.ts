"use client";

import { createClient } from "@supabase/supabase-js";
import { tryGetSupabaseEnv } from "@/lib/config/supabaseEnv";

export const createSupabaseBrowserClient = () => {
  const env = tryGetSupabaseEnv();
  if (!env) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
