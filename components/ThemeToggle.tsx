"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonStarsIcon, SunHorizonIcon } from "@phosphor-icons/react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";
  const label = !mounted
    ? "Cambiar tema"
    : isDark
      ? "Activar modo claro"
      : "Activar modo oscuro";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
      aria-label={label}
      aria-pressed={mounted ? isDark : undefined}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[var(--fg)] transition-colors hover:border-[var(--fg)] hover:bg-[var(--bg-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-wait"
    >
      {mounted ? (
        isDark ? (
          <SunHorizonIcon aria-hidden size={19} weight="duotone" />
        ) : (
          <MoonStarsIcon aria-hidden size={19} weight="duotone" />
        )
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
