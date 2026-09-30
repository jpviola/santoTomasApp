import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Destino del link de confirmación de email (emailRedirectTo en LoginForm).
 * Canjea el código PKCE por una sesión y vuelve al inicio. Si el canje falla (p. ej. el link se abrió
 * en otro navegador, sin el code verifier), el email igual quedó confirmado: se manda a /login para entrar.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: true };
    if (!error) return NextResponse.redirect(new URL("/", origin));
  }

  const status = searchParams.get("error") ? "error" : "confirmed";
  return NextResponse.redirect(new URL(`/login?${status}=1`, origin));
}
