import type { Metadata } from "next";
import LearnShell from "@/app/learn/LearnShell";

export const metadata: Metadata = {
  title: "Aprender · StoTomas AI",
  description: "Itinerario para aprender la filosofía de Tomás de Aquino y su contexto, con lecciones, repasos y un tutor.",
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <LearnShell>{children}</LearnShell>;
}
