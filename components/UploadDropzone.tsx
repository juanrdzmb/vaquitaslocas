"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  onFile: (file: File) => void;
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

export default function UploadDropzone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile, disabled]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-6 rounded-2xl border border-dashed p-10 text-center transition-all",
        dragging
          ? "border-[var(--accent)] bg-[var(--bg-alt)] scale-[1.01]"
          : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--fg-muted)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line)] transition-all",
          dragging ? "border-[var(--accent)] text-[var(--accent)]" : "text-[var(--fg-muted)]",
          "group-hover:border-[var(--fg)] group-hover:text-[var(--fg)]"
        )}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V4M12 4l-5 5M12 4l5 5" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </div>

      <div className="space-y-1.5">
        <p className="font-display text-2xl tracking-tightest">
          Arrastra tu Excel aquí
        </p>
        <p className="text-sm text-[var(--fg-muted)]">
          o haz clic para elegir un archivo · .xlsx, .xls, .csv
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--fg-muted)]">
        <span className="rounded-full border border-[var(--line)] px-3 py-1">
          Itinerario
        </span>
        <span className="rounded-full border border-[var(--line)] px-3 py-1">
          Presupuesto
        </span>
        <span className="rounded-full border border-[var(--line)] px-3 py-1">
          Lugares
        </span>
        <span className="rounded-full border border-[var(--line)] px-3 py-1">
          Varias hojas
        </span>
      </div>
    </div>
  );
}
