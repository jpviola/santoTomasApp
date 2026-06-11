"use client";

import { useState } from "react";

type ExportMarkdownButtonProps = {
  recordId?: string | null;
  language?: "es" | "en";
};

export default function ExportMarkdownButton({ recordId, language = "es" }: ExportMarkdownButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!recordId) return;

    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch(`/api/debate/${recordId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to export Markdown.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `debate-${recordId}.md`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown export error.";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  }

  if (!recordId) return null;

  const label = language === "es" ? "Exportar" : "Export";
  const busyLabel = language === "es" ? "Exportando…" : "Exporting…";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        aria-label={language === "es" ? "Exportar como Markdown" : "Export as Markdown"}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExporting ? busyLabel : label}
      </button>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
