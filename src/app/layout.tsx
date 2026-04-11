import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StoTomas AI",
  description: "Scholastic multi-agent debate system inspired by Thomas Aquinas.",
  icons: {
    icon: "/favicon_aquino.ico",
    shortcut: "/favicon_aquino.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:border focus:border-white/10 focus:bg-white/10 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-100 focus:backdrop-blur"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
