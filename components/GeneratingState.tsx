"use client";

import { motion } from "framer-motion";
import { easterEggFor } from "@/config/easter-eggs";
import EasterEggSticker from "./EasterEggSticker";

type Props = {
  fileName: string;
  label: string;
  progress: number;
  phase: "reading" | "generating";
  onCancel: () => void;
};

const STEPS = [
  { at: 0.05, label: "Abrir el libro" },
  { at: 0.25, label: "Separar celdas del peso muerto" },
  { at: 0.55, label: "Revisar todas las hojas" },
  { at: 0.72, label: "Conservar fotos y recorridos" },
  { at: 0.87, label: "Escribir como Juan, no como folleto" },
  { at: 0.962, label: "Comprobar rutas y reservas" },
  { at: 0.99, label: "Guardar la guía" },
];

export default function GeneratingState({ fileName, label, progress, phase, onCancel }: Props) {
  const bounded = Math.max(0.04, Math.min(progress, 1));
  const loadingEgg = easterEggFor("loading");
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--bg)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
      <div aria-hidden className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
      <div className="relative grid gap-10 md:grid-cols-[1fr_0.82fr] md:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent)]" />
            </span>
            <span className="eyebrow">{phase === "reading" ? "Leyendo aquí" : "Juan está montando la guía"}</span>
          </div>
          <h2 className="mt-5 max-w-xl font-display text-3xl leading-tight tracking-tightest sm:text-5xl">
            {phase === "reading" ? "Sacando el viaje de entre las celdas." : "Convirtiendo planes en una app que sí da gusto abrir."}
          </h2>
          <p className="mt-4 truncate text-sm text-[var(--fg-muted)]">{fileName}</p>
          <p className="mt-8 min-h-6 text-base" role="status" aria-live="polite">
            {label}
          </p>

          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--line)]"
            role="progressbar"
            aria-label="Progreso de creación de la guía"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(bounded * 100)}
          >
            <motion.div
              className="h-full rounded-full bg-[var(--accent)]"
              animate={{ width: `${bounded * 100}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            <span>{phase === "reading" ? "Procesamiento local" : "Curaduría con DeepSeek"}</span>
            <span>{Math.round(bounded * 100)}%</span>
          </div>
        </div>

        <div className="grid gap-4">
          {loadingEgg && <EasterEggSticker egg={loadingEgg} variant="loading" />}
          <p className="text-center font-display text-sm italic text-[var(--fg-muted)]">
            Puedes tocar al sospechoso. El Excel ya declaró sin abogado.
          </p>
          <ol className="grid gap-2">
            {STEPS.map((step, index) => {
              const done = bounded >= step.at;
              const active = done && (index === STEPS.length - 1 || bounded < STEPS[index + 1].at);
              return (
                <li key={step.label} className="flex min-h-10 min-w-0 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-alt)] px-3 py-2 min-[360px]:px-4">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${done ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "border border-[var(--line)] text-[var(--fg-muted)]"}`}>
                    {done && !active ? "✓" : String(index + 1)}
                  </span>
                  <span className={done ? "min-w-0 break-words text-xs" : "min-w-0 break-words text-xs text-[var(--fg-muted)]"}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <button onClick={onCancel} className="mt-8 min-h-11 rounded-full border border-[var(--line)] px-5 text-sm text-[var(--fg-muted)] transition hover:border-[var(--fg)] hover:text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
        Cancelar
      </button>
    </div>
  );
}
