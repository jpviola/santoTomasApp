"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign_in" | "sign_up";

export default function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "sign_up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          throw signUpError;
        }
        router.push("/");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Acceso</h1>
        <p className="mt-1 text-sm text-slate-300/70">Inicia sesión o crea una cuenta para guardar tu historial.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("sign_in")}
          aria-pressed={mode === "sign_in"}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            mode === "sign_in"
              ? "border-white/20 bg-white/10 text-slate-100"
              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("sign_up")}
          aria-pressed={mode === "sign_up"}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            mode === "sign_up"
              ? "border-white/20 bg-white/10 text-slate-100"
              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {!supabase ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-200/80">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-200/80">Contraseña</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || email.trim().length === 0 || password.length < 6}
        className="w-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.25)] transition hover:from-violet-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Procesando…" : mode === "sign_up" ? "Crear cuenta" : "Entrar"}
      </button>
    </div>
  );
}
