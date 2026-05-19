"use client";

type FooterProps = {
  language: "es" | "en";
};

export default function Footer({ language }: FooterProps) {
  const isSpanish = language === "es";
  
  const links = isSpanish
    ? [
        { label: "Acerca", href: "#" },
        { label: "Metodología", href: "#" },
        { label: "API", href: "#" },
        { label: "Privacidad", href: "#" },
      ]
    : [
        { label: "About", href: "#" },
        { label: "Methodology", href: "#" },
        { label: "API", href: "#" },
        { label: "Privacy", href: "#" },
      ];

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]/50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg font-semibold text-[var(--foreground)]">
              StoTomas<span className="text-[var(--accent)]">.ai</span>
            </span>
            <span className="rounded bg-[var(--surface-strong)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
              v0.1
            </span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-4 text-center text-[11px] text-[var(--muted)]">
          {isSpanish
            ? "Disputas escolásticas generadas por IA inspiradas en Tomás de Aquino"
            : "AI-generated scholastic disputations inspired by Thomas Aquinas"}
        </div>
      </div>
    </footer>
  );
}