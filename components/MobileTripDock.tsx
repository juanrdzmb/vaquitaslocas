"use client";

import { useEffect, useMemo, useState } from "react";

type DockItem = {
  id: string;
  label: string;
  icon: "home" | "route" | "map" | "sparkles";
};

export default function MobileTripDock({
  hasItinerary,
  hasMap,
  hasRecommendations,
}: {
  hasItinerary: boolean;
  hasMap: boolean;
  hasRecommendations: boolean;
}) {
  const items = useMemo<DockItem[]>(() => {
    const next: DockItem[] = [{ id: "trip-top", label: "Portada", icon: "home" }];
    if (hasItinerary) {
      next.push({ id: "itinerario", label: "Días", icon: "route" });
    }
    if (hasMap) next.push({ id: "mapa", label: "Mapa", icon: "map" });
    else if (hasRecommendations) {
      next.push({ id: "recomendaciones", label: "Ideas", icon: "sparkles" });
    }
    return next;
  }, [hasItinerary, hasMap, hasRecommendations]);

  const [active, setActive] = useState(items[0]?.id ?? "trip-top");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.05, 0.2, 0.5] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="mobile-trip-dock" aria-label="Navegación rápida del viaje">
      <div
        className="mobile-trip-dock__inner"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="mobile-trip-dock__item"
            aria-current={active === item.id ? "location" : undefined}
          >
            <DockIcon name={item.icon} />
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

function DockIcon({ name }: { name: DockItem["icon"] }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
    );
  }
  if (name === "route") {
    return (
      <svg {...common}>
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="5" r="2" />
        <path d="M8 19h3a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3h-1a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2h7" />
      </svg>
    );
  }
  if (name === "map") {
    return (
      <svg {...common}>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
        <path d="M9 3v15M15 6v15" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z" />
    </svg>
  );
}
