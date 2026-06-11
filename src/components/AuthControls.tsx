"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthControlsProps = {
  language?: "es" | "en";
  onAuthChange?: () => void;
};

export default function AuthControls({ language = "es", onAuthChange }: AuthControlsProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setIsReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      onAuthChange?.();
    });

    return () => subscription.subscription.unsubscribe();
  }, [supabase, onAuthChange]);

  // Supabase sin configurar: la app funciona en modo anónimo, sin controles.
  if (!supabase || !isReady) return null;

  const t =
    language === "es"
      ? { signIn: "Entrar", signOut: "Salir", account: "Cuenta" }
      : { signIn: "Sign in", signOut: "Sign out", account: "Account" };

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
      >
        {t.signIn}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5" title={`${t.account}: ${email}`}>
      <span className="hidden max-w-[140px] truncate text-[11px] text-[var(--muted)] md:inline">{email}</span>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut()}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
      >
        {t.signOut}
      </button>
    </div>
  );
}
