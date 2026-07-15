"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HouseLineIcon,
  MapTrifoldIcon,
  PathIcon,
  SparkleIcon,
  TableIcon,
} from "@phosphor-icons/react";

type DockItem = {
  id: string;
  label: string;
  icon: "home" | "source" | "route" | "map" | "sparkles";
};

export default function MobileTripDock({
  hasItinerary,
  hasSource,
  hasMap,
  hasRecommendations,
}: {
  hasItinerary: boolean;
  hasSource: boolean;
  hasMap: boolean;
  hasRecommendations: boolean;
}) {
  const items = useMemo<DockItem[]>(() => {
    const next: DockItem[] = [{ id: "trip-top", label: "Portada", icon: "home" }];
    if (hasSource) next.push({ id: "excel-amanda", label: "Tu Excel", icon: "source" });
    if (hasItinerary) {
      next.push({ id: "itinerario", label: "Días", icon: "route" });
    }
    if (hasMap) next.push({ id: "mapa", label: "Mapa", icon: "map" });
    else if (hasRecommendations) {
      next.push({ id: "recomendaciones", label: "Ideas", icon: "sparkles" });
    }
    return next;
  }, [hasItinerary, hasSource, hasMap, hasRecommendations]);

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
  if (name === "home") return <HouseLineIcon size={20} weight="duotone" aria-hidden />;
  if (name === "source") return <TableIcon size={20} weight="duotone" aria-hidden />;
  if (name === "route") return <PathIcon size={20} weight="duotone" aria-hidden />;
  if (name === "map") return <MapTrifoldIcon size={20} weight="duotone" aria-hidden />;
  return <SparkleIcon size={20} weight="duotone" aria-hidden />;
}
