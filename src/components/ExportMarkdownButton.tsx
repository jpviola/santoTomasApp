"use client";

import { useState } from "react";

type ExportMarkdownButtonProps = {
  recordId?: string | null;
};

export default function ExportMarkdownButton({ recordId }: ExportMarkdownButtonProps) {
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

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.25)] transition hover:from-violet-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExporting ? "Exporting..." : "Export Markdown"}
      </button>

      {error ? <p className="text-xs text-red-200/90">{error}</p> : null}
    </div>
  );
}
