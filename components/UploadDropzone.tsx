"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isSupportedWorkbook } from "@/lib/excel-client";
import { WORKBOOK_LIMITS } from "@/lib/workbook";
import { UploadSimpleIcon } from "@phosphor-icons/react";

type Props = {
  onFile: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

const ACCEPTED = [
  ".xlsx",
  ".xls",
  ".csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

export default function UploadDropzone({ onFile, onError, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = useCallback(
    (file?: File) => {
      if (!file || disabled) return;
      if (!isSupportedWorkbook(file)) {
        onError?.("Ese formato no me sirve todavía. Usa .xlsx, .xls o .csv.");
        return;
      }
      if (file.size > WORKBOOK_LIMITS.maxSourceBytes) {
        onError?.("El archivo supera 40 MB. Quita imágenes pesadas o divide el libro.");
        return;
      }
      if (!file.size) {
        onError?.("Ese archivo está vacío.");
        return;
      }
      onFile(file);
    },
    [disabled, onError, onFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      choose(event.dataTransfer.files?.[0]);
    },
    [choose]
  );

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      aria-disabled={disabled}
      aria-describedby="upload-help"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !disabled) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "group relative isolate flex min-h-[330px] cursor-pointer flex-col justify-between overflow-hidden rounded-[2rem] border p-6 text-left transition duration-300 sm:p-8",
        dragging
          ? "scale-[1.01] border-[var(--accent)] bg-[var(--bg-alt)] shadow-2xl"
          : "border-[var(--line)] bg-[var(--bg)] shadow-[0_24px_80px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-[var(--accent)]",
        disabled && "cursor-not-allowed opacity-55"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div
        aria-hidden
        className="absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.10] blur-3xl transition-transform duration-500 group-hover:scale-125"
      />

      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--bg-alt)] px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
          Importador inteligente
        </span>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--fg)] text-[var(--bg)] shadow-lg transition-transform group-hover:-translate-y-1" aria-hidden>
          <UploadSimpleIcon size={24} weight="duotone" />
        </span>
      </div>

      <div className="my-10 max-w-lg">
        <p className="font-display text-3xl leading-[1.02] tracking-tightest sm:text-4xl">
          Suelta aquí el Excel.
          <span className="block italic text-[var(--accent)]">El caos me lo quedo yo.</span>
        </p>
        <p id="upload-help" className="mt-4 max-w-md text-sm leading-relaxed text-[var(--fg-muted)] sm:text-base">
          También puedes tocar para elegirlo. Funciona con varias hojas y con archivos llenos de imágenes: solo viajan las celdas útiles.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
        {["XLSX", "XLS", "CSV", "hasta 40 MB"].map((label) => (
          <span key={label} className="rounded-full border border-[var(--line)] bg-[var(--bg-alt)] px-3 py-1.5">
            {label}
          </span>
        ))}
        <span className="ml-auto hidden items-center gap-2 text-[11px] sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          El archivo original no se guarda
        </span>
      </div>
    </div>
  );
}
