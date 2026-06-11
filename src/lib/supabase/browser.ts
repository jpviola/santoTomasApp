"use client";

import { createBrowserClient } from "@supabase/ssr";
import { tryGetSupabaseEnv } from "@/lib/config/supabaseEnv";

// Cookie-based client (@supabase/ssr) so API routes and middleware can read the session.
export const createSupabaseBrowserClient = () => {
  const env = tryGetSupabaseEnv();
  if (!env) return null;
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
