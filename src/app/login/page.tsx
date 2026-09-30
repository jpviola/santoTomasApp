import Link from "next/link";
import LoginForm from "@/app/login/ui/LoginForm";

export default function LoginPage() {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <span aria-hidden="true">←</span> StoTomas AI
        </Link>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
