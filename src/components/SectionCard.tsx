import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  children: ReactNode;
};

export default function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <h2 className="mb-3 text-base font-semibold tracking-tight text-slate-100">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-200/90">{children}</div>
    </section>
  );
}
