"use client";

import { useState } from "react";

type ExportMetadataPanelProps = {
  recordId?: string | null;
  language?: "es" | "en";
};

export default function ExportMetadataPanel({ recordId, language = "en" }: ExportMetadataPanelProps) {
  const [course, setCourse] = useState("");
  const [module, setModule] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("evergreen");
  const [archivePath, setArchivePath] = useState("");
  const [customTags, setCustomTags] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t =
    language === "es"
      ? {
          title: "Metadatos de exportación",
          subtitle: "Sobrescribe el frontmatter antes de descargar el Markdown.",
          show: "Mostrar",
          hide: "Ocultar",
          course: "Curso",
          module: "Módulo",
          topic: "Tema",
          status: "Estado",
          archivePath: "Ruta sugerida",
          customTags: "Tags personalizados",
          customTagsHelp: "Separa tags con comas.",
          exporting: "Exportando…",
          download: "Descargar Markdown",
          exportFailed: "Falló la exportación de Markdown.",
          unknownExportError: "Error desconocido al exportar.",
        }
      : {
          title: "Export Metadata",
          subtitle: "Override frontmatter before downloading Markdown.",
          show: "Show",
          hide: "Hide",
          course: "Course",
          module: "Module",
          topic: "Topic",
          status: "Status",
          archivePath: "Archive path hint",
          customTags: "Custom tags",
          customTagsHelp: "Separate tags with commas.",
          exporting: "Exporting...",
          download: "Download Markdown",
          exportFailed: "Failed to export Markdown.",
          unknownExportError: "Unknown export error.",
        };

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
        body: JSON.stringify({
          course: course.trim() || undefined,
          module: module.trim() || undefined,
          topic: topic.trim() || undefined,
          status: status.trim() || undefined,
          archivePath: archivePath.trim() || undefined,
          customTags: customTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || t.exportFailed);
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
      const message = err instanceof Error ? err.message : t.unknownExportError;
      setError(message);
    } finally {
      setIsExporting(false);
    }
  }

  if (!recordId) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{t.title}</h3>
          <p className="mt-1 text-xs text-slate-300/70">{t.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
        >
          {isOpen ? t.hide : t.show}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200/80">{t.course}</label>
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
              placeholder="Philosophical Anthropology"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200/80">{t.module}</label>
            <input
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
              placeholder="Intellect and Knowledge"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200/80">{t.topic}</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
              placeholder="intellect-and-understanding"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200/80">{t.status}</label>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
              placeholder="evergreen"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200/80">{t.archivePath}</label>
            <input
              value={archivePath}
              onChange={(e) => setArchivePath(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
              placeholder="Resources/Philosophy/AI"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200/80">{t.customTags}</label>
            <input
              value={customTags}
              onChange={(e) => setCustomTags(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-violet-400/60 focus:bg-black/30"
              placeholder="husserl, consciousness, seminar"
            />
            <p className="mt-1 text-[11px] text-slate-300/70">{t.customTagsHelp}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.25)] transition hover:from-violet-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? t.exporting : t.download}
            </button>
          </div>

          {error ? <p className="text-xs text-red-200/90">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
