"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const STEPS = [
  "Leyendo tu Excel…",
  "Identificando destinos y fechas…",
  "Construyendo el itinerario…",
  "Calculando el presupuesto…",
  "Buscando joyas ocultas y librerías…",
  "Geolocalizando lugares en el mapa…",
  "Componiendo tu página…",
];

export default function GeneratingState({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-10">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border border-[var(--line)]" />
        <motion.div
          className="absolute inset-0 rounded-full border-t-[var(--accent)]"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-3 rounded-full bg-[var(--bg-alt)]"
          animate={{ scale: [1, 0.92, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </div>

      <div className="space-y-3 text-center">
        <p className="eyebrow">Procesando</p>
        <p className="font-display text-2xl tracking-tightest text-balance">
          {fileName}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-[var(--fg-muted)]"
          >
            {STEPS[step]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="h-px w-64 overflow-hidden bg-[var(--line)]">
        <motion.div
          className="h-full bg-[var(--accent)]"
          animate={{ width: ["0%", "100%"] }}
          transition={{ duration: 16, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
