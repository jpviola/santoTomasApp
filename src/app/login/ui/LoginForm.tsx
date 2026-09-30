"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign_in" | "sign_up";

const MIN_PASSWORD = 6;

export default function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [language, setLanguage] = useState<"es" | "en">("es");
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let lang: "es" | "en" = "es";
    try {
      if (window.localStorage.getItem("stotomas.language") === "en") lang = "en";
    } catch {
      // Sin localStorage: queda en español.
    }
    setLanguage(lang);
    // Vuelta desde /auth/callback cuando no se pudo abrir la sesión automáticamente.
    const params = new URLSearchParams(window.location.search);
    if (params.has("confirmed")) {
      setNotice(lang === "es" ? "Tu cuenta está confirmada. Entrá con tu email y contraseña." : "Your account is confirmed. Sign in with your email and password.");
    } else if (params.has("error")) {
      setError(lang === "es" ? "El link de confirmación no es válido o ya venció. Probá entrar o registrarte de nuevo." : "The confirmation link is invalid or expired. Try signing in or signing up again.");
    }
  }, []);

  const t =
    language === "es"
      ? {
          title: "Tu biblioteca",
          subtitle: "Iniciá sesión o creá una cuenta para guardar tu historial de disputas.",
          signIn: "Entrar",
          signUp: "Crear cuenta",
          email: "Email",
          emailPlaceholder: "tu@email.com",
          password: "Contraseña",
          passwordHint: `Al menos ${MIN_PASSWORD} caracteres.`,
          loading: "Procesando…",
          notConfigured:
            "El inicio de sesión no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
          confirmEmail: "Te enviamos un email para confirmar la cuenta. Después de confirmarla, volvé acá para entrar.",
          unexpected: "Error inesperado.",
        }
      : {
          title: "Your library",
          subtitle: "Sign in or create an account to save your disputation history.",
          signIn: "Sign in",
          signUp: "Create account",
          email: "Email",
          emailPlaceholder: "you@email.com",
          password: "Password",
          passwordHint: `At least ${MIN_PASSWORD} characters.`,
          loading: "Working…",
          notConfigured:
            "Sign-in is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) are missing.",
          confirmEmail: "We sent you an email to confirm your account. Once confirmed, come back here to sign in.",
          unexpected: "Unexpected error.",
        };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign_up") {
        // Vuelve al dominio desde el que se registró (debe estar en Redirect URLs de Supabase;
        // si no, Supabase usa su Site URL).
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        // Con confirmación por email activada, Supabase no devuelve sesión hasta que se confirme.
        if (!data.session) {
          setMode("sign_in");
          setPassword("");
          setNotice(t.confirmEmail);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.unexpected);
    } finally {
      setIsLoading(false);
    }
  };

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
        : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
    }`;

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:opacity-60";

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">StoTomas AI</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-[var(--muted-strong)]">{t.subtitle}</p>
      </div>

      <div
        role="tablist"
        className="grid grid-cols-2 gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5"
      >
        <button type="button" role="tab" aria-selected={mode === "sign_in"} onClick={() => switchMode("sign_in")} className={tabClass(mode === "sign_in")}>
          {t.signIn}
        </button>
        <button type="button" role="tab" aria-selected={mode === "sign_up"} onClick={() => switchMode("sign_up")} className={tabClass(mode === "sign_up")}>
          {t.signUp}
        </button>
      </div>

      {!supabase && (
        <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] leading-5 text-amber-700 dark:text-amber-200">
          {t.notConfigured}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-strong)]">
            {t.email}
          </label>
          <input
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            disabled={!supabase}
            className={inputClass}
            placeholder={t.emailPlaceholder}
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-strong)]">
            {t.password}
          </label>
          <input
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={MIN_PASSWORD}
            autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
            aria-describedby={mode === "sign_up" ? "login-password-hint" : undefined}
            disabled={!supabase}
            className={inputClass}
            placeholder="••••••••"
          />
          {mode === "sign_up" && (
            <p id="login-password-hint" className="mt-1 text-[11px] text-[var(--muted)]">
              {t.passwordHint}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[13px] leading-5 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-[13px] leading-5 text-[var(--foreground)]">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={!supabase || isLoading || email.trim().length === 0 || password.length < MIN_PASSWORD}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--surface)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? t.loading : mode === "sign_up" ? t.signUp : t.signIn}
        </button>
      </form>
    </div>
  );
}
