"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowSquareOutIcon, XIcon } from "@phosphor-icons/react";
import type { EasterEgg } from "@/config/easter-eggs";

type Props = {
  egg: EasterEgg;
  variant?: "loading" | "floating" | "footer";
};

export default function EasterEggSticker({ egg, variant = "floating" }: Props) {
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useReducedMotion();
  const hasLink = egg.href !== "#" && egg.href.trim() !== "";
  const image = (
    <motion.span
      className={
        variant === "loading"
          ? "relative block h-44 w-44 sm:h-52 sm:w-52"
          : variant === "footer"
            ? "relative block h-24 w-24 sm:h-28 sm:w-28"
            : "relative block h-20 w-20 sm:h-24 sm:w-24"
      }
      animate={
        reduceMotion
          ? undefined
          : variant === "loading"
            ? { y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }
            : { y: [0, -5, 0], rotate: [0, 2, -2, 0] }
      }
      transition={{ duration: variant === "loading" ? 3.4 : 4.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <Image
        src={egg.image}
        alt={egg.alt}
        fill
        sizes={variant === "loading" ? "208px" : "112px"}
        className="object-contain drop-shadow-[0_14px_18px_rgba(15,23,42,0.18)]"
        priority={variant === "loading"}
      />
    </motion.span>
  );

  return (
    <div className={`relative ${variant === "loading" ? "mx-auto w-fit" : "w-fit"}`}>
      {hasLink ? (
        <a
          href={egg.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-[2rem] transition hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          title={egg.title}
        >
          {image}
          <span className="sr-only">{egg.title}. Abre un enlace secreto.</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          className="group block rounded-[2rem] transition hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          aria-expanded={revealed}
          title="Hay algo sospechoso aquí"
        >
          {image}
          <span className="sr-only">Descubrir: {egg.title}</span>
        </button>
      )}

      {revealed && !hasLink && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`easter-egg-reveal absolute z-40 w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 text-left shadow-2xl ${
            variant === "footer" ? "bottom-full left-0 mb-2" : "left-1/2 top-full mt-1 -translate-x-1/2"
          }`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg leading-tight tracking-tightest">{egg.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">{egg.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setRevealed(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)]"
              aria-label="Cerrar secreto"
            >
              <XIcon size={14} weight="bold" aria-hidden />
            </button>
          </div>
          <p className="mt-3 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--accent)]">
            <ArrowSquareOutIcon size={13} weight="duotone" aria-hidden />
            Enlace pendiente: edítalo en config/easter-eggs.ts
          </p>
        </motion.div>
      )}
    </div>
  );
}
