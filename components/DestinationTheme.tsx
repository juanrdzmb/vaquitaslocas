import type { CSSProperties, ReactNode } from "react";
import type { Trip } from "@/lib/schema";
import { deriveTripTheme } from "@/lib/trip-theme";

type TripWithOptionalTheme = Trip & { visualTheme?: unknown };

type ThemeStyle = CSSProperties & Record<`--${string}`, string | number>;

export default function DestinationTheme({
  trip,
  children,
}: {
  trip: TripWithOptionalTheme;
  children: ReactNode;
}) {
  const theme = deriveTripTheme(trip.destination, trip.visualTheme);
  const style: ThemeStyle = {
    "--trip-light-bg": theme.light.bg,
    "--trip-light-bg-alt": theme.light.bgAlt,
    "--trip-light-fg": theme.light.fg,
    "--trip-light-muted": theme.light.muted,
    "--trip-light-line": theme.light.line,
    "--trip-light-accent": theme.light.accent,
    "--trip-light-accent-ink": theme.light.accentInk,
    "--trip-light-glow": theme.light.glow,
    "--trip-dark-bg": theme.dark.bg,
    "--trip-dark-bg-alt": theme.dark.bgAlt,
    "--trip-dark-fg": theme.dark.fg,
    "--trip-dark-muted": theme.dark.muted,
    "--trip-dark-line": theme.dark.line,
    "--trip-dark-accent": theme.dark.accent,
    "--trip-dark-accent-ink": theme.dark.accentInk,
    "--trip-dark-glow": theme.dark.glow,
    "--trip-hero-light": theme.heroLight,
    "--trip-hero-dark": theme.heroDark,
    "--trip-origin-x": `${theme.originX}%`,
    "--trip-origin-y": `${theme.originY}%`,
    "--trip-angle": `${theme.angle}deg`,
  };

  return (
    <div
      className="destination-theme"
      data-trip-theme={theme.id}
      data-trip-motif={theme.motif}
      data-trip-signature={theme.signature}
      style={style}
    >
      {children}
    </div>
  );
}

