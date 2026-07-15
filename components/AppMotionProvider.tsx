"use client";

import { MotionConfig } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";

function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const themed = document.querySelector<HTMLElement>(".destination-theme");
      const color = getComputedStyle(themed ?? document.documentElement)
        .getPropertyValue("--bg")
        .trim();
      if (!color) return;
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      metas.forEach((meta) => meta.setAttribute("content", color));
    });
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);
  return null;
}

export default function AppMotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeColorSync />
      {children}
    </MotionConfig>
  );
}
