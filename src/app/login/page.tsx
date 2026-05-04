import LoginForm from "@/app/login/ui/LoginForm";

export default function LoginPage() {
  return (
    <main id="main-content" className="min-h-screen">
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

