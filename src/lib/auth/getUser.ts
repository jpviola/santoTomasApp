import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
};

/**
 * Resolves the authenticated user from the request cookies.
 * Returns null when Supabase is not configured or there is no session.
 */
export const getAuthUser = async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
};
