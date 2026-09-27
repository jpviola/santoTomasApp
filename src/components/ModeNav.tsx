import Link from "next/link";

type ModeNavProps = {
  active: "debate" | "learn";
  language: "es" | "en";
  className?: string;
};

export default function ModeNav({ active, language, className = "" }: ModeNavProps) {
  const items = [
    { id: "debate" as const, href: "/", label: language === "es" ? "Disputa" : "Disputation" },
    { id: "learn" as const, href: "/learn", label: language === "es" ? "Aprender" : "Learn" },
  ];

  return (
    <nav
      aria-label={language === "es" ? "Modo de la app" : "App mode"}
      className={`flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 ${className}`}
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={active === item.id ? "page" : undefined}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
            active === item.id
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
