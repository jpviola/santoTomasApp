import type { Metadata } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StoTomas AI",
  description: "Scholastic multi-agent debate system inspired by Thomas Aquinas.",
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
  },
};

// Aplica el tema guardado antes del primer pintado para evitar un destello claro a quien eligió oscuro.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.add(d?"dark":"light");r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${sourceSerif.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-[var(--border)] focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--foreground)] focus:shadow-[var(--shadow-soft)]"
          >
            Saltar al contenido
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
