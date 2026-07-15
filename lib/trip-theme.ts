export type ThemePalette = {
  id: string;
  label: string;
  motif: "contour" | "grid" | "sun" | "waves" | "arches" | "stars";
  light: ThemeColors;
  dark: ThemeColors;
  heroLight: string;
  heroDark: string;
};

export type ThemeColors = {
  bg: string;
  bgAlt: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  glow: string;
};

export type TripTheme = {
  id: string;
  label: string;
  motif: ThemePalette["motif"];
  signature: string;
  originX: number;
  originY: number;
  angle: number;
  light: ThemeColors;
  dark: ThemeColors;
  heroLight: string;
  heroDark: string;
};

const PALETTES: ThemePalette[] = [
  {
    id: "danube",
    label: "Danubio",
    motif: "arches",
    light: {
      bg: "#faf6fb",
      bgAlt: "#f0e7f0",
      fg: "#2b1725",
      muted: "#735f6d",
      line: "#decbd8",
      accent: "#6f365f",
      accentInk: "#ffffff",
      glow: "rgba(77, 126, 160, 0.19)",
    },
    dark: {
      bg: "#1a1018",
      bgAlt: "#281a25",
      fg: "#faeef7",
      muted: "#c8adbe",
      line: "#4b3042",
      accent: "#e5a5d1",
      accentInk: "#321126",
      glow: "rgba(99, 167, 196, 0.15)",
    },
    heroLight:
      "linear-gradient(132deg, rgba(111,54,95,.18), transparent 48%), radial-gradient(circle at 83% 12%, rgba(58,130,166,.24), transparent 33%), radial-gradient(circle at 67% 82%, rgba(191,145,49,.18), transparent 31%)",
    heroDark:
      "linear-gradient(132deg, rgba(229,165,209,.17), transparent 48%), radial-gradient(circle at 83% 12%, rgba(99,167,196,.16), transparent 33%), radial-gradient(circle at 67% 82%, rgba(216,176,85,.10), transparent 31%)",
  },
  {
    id: "atlantic",
    label: "Atlántico",
    motif: "waves",
    light: {
      bg: "#f3f8f6",
      bgAlt: "#e5efeb",
      fg: "#102c2c",
      muted: "#526b68",
      line: "#c4d9d3",
      accent: "#087079",
      accentInk: "#ffffff",
      glow: "rgba(31, 154, 160, 0.18)",
    },
    dark: {
      bg: "#07191a",
      bgAlt: "#102728",
      fg: "#edf7f3",
      muted: "#a8c3bd",
      line: "#29494a",
      accent: "#67d5d1",
      accentInk: "#082020",
      glow: "rgba(103, 213, 209, 0.14)",
    },
    heroLight:
      "linear-gradient(135deg, rgba(8,112,121,.17), transparent 52%), radial-gradient(circle at 84% 18%, rgba(239,153,91,.22), transparent 33%)",
    heroDark:
      "linear-gradient(135deg, rgba(103,213,209,.18), transparent 52%), radial-gradient(circle at 84% 18%, rgba(239,153,91,.13), transparent 34%)",
  },
  {
    id: "terracotta",
    label: "Terracota",
    motif: "arches",
    light: {
      bg: "#fbf5ed",
      bgAlt: "#f2e6d9",
      fg: "#2c1d18",
      muted: "#755f55",
      line: "#dfcbbc",
      accent: "#a84428",
      accentInk: "#ffffff",
      glow: "rgba(190, 83, 47, 0.17)",
    },
    dark: {
      bg: "#1b110e",
      bgAlt: "#291914",
      fg: "#faeee3",
      muted: "#c8aa9a",
      line: "#4a3027",
      accent: "#ef9a70",
      accentInk: "#2b120a",
      glow: "rgba(239, 154, 112, 0.14)",
    },
    heroLight:
      "linear-gradient(125deg, rgba(168,68,40,.16), transparent 48%), radial-gradient(circle at 78% 8%, rgba(226,178,84,.26), transparent 34%)",
    heroDark:
      "linear-gradient(125deg, rgba(239,154,112,.18), transparent 48%), radial-gradient(circle at 78% 8%, rgba(226,178,84,.12), transparent 34%)",
  },
  {
    id: "metropolis",
    label: "Metrópolis",
    motif: "grid",
    light: {
      bg: "#f6f5fa",
      bgAlt: "#eae8f2",
      fg: "#1e1c2e",
      muted: "#656178",
      line: "#d2cede",
      accent: "#5143a7",
      accentInk: "#ffffff",
      glow: "rgba(81, 67, 167, 0.17)",
    },
    dark: {
      bg: "#100f19",
      bgAlt: "#1b1928",
      fg: "#f4f1ff",
      muted: "#b5afce",
      line: "#37324d",
      accent: "#afa1ff",
      accentInk: "#17112d",
      glow: "rgba(175, 161, 255, 0.15)",
    },
    heroLight:
      "linear-gradient(145deg, rgba(81,67,167,.16), transparent 50%), radial-gradient(circle at 88% 12%, rgba(64,166,187,.20), transparent 32%)",
    heroDark:
      "linear-gradient(145deg, rgba(175,161,255,.17), transparent 50%), radial-gradient(circle at 88% 12%, rgba(64,166,187,.13), transparent 32%)",
  },
  {
    id: "alpine",
    label: "Alpino",
    motif: "contour",
    light: {
      bg: "#f5f7f2",
      bgAlt: "#e7ece1",
      fg: "#1d2a24",
      muted: "#5e6d64",
      line: "#cdd8ce",
      accent: "#316746",
      accentInk: "#ffffff",
      glow: "rgba(70, 129, 91, 0.16)",
    },
    dark: {
      bg: "#0d1712",
      bgAlt: "#17231c",
      fg: "#eef5ea",
      muted: "#adbeae",
      line: "#314238",
      accent: "#8bc79a",
      accentInk: "#102417",
      glow: "rgba(139, 199, 154, 0.13)",
    },
    heroLight:
      "linear-gradient(150deg, rgba(49,103,70,.15), transparent 52%), radial-gradient(circle at 80% 10%, rgba(121,161,174,.22), transparent 35%)",
    heroDark:
      "linear-gradient(150deg, rgba(139,199,154,.15), transparent 52%), radial-gradient(circle at 80% 10%, rgba(121,161,174,.12), transparent 35%)",
  },
  {
    id: "canyon",
    label: "Cañón",
    motif: "sun",
    light: {
      bg: "#fbf6ea",
      bgAlt: "#f1e5cf",
      fg: "#302319",
      muted: "#746250",
      line: "#decdb1",
      accent: "#9c4d18",
      accentInk: "#ffffff",
      glow: "rgba(210, 113, 36, 0.18)",
    },
    dark: {
      bg: "#1b130c",
      bgAlt: "#291d12",
      fg: "#fbefdc",
      muted: "#cbb59a",
      line: "#4d3926",
      accent: "#f0a35a",
      accentInk: "#321705",
      glow: "rgba(240, 163, 90, 0.14)",
    },
    heroLight:
      "linear-gradient(120deg, rgba(156,77,24,.14), transparent 48%), radial-gradient(circle at 82% 13%, rgba(239,172,62,.30), transparent 34%)",
    heroDark:
      "linear-gradient(120deg, rgba(240,163,90,.16), transparent 48%), radial-gradient(circle at 82% 13%, rgba(239,172,62,.13), transparent 34%)",
  },
  {
    id: "tropical",
    label: "Tropical",
    motif: "sun",
    light: {
      bg: "#f5f8ed",
      bgAlt: "#e7eed7",
      fg: "#1d2b19",
      muted: "#5e7057",
      line: "#cad9bd",
      accent: "#376d2b",
      accentInk: "#ffffff",
      glow: "rgba(86, 145, 59, 0.17)",
    },
    dark: {
      bg: "#0d180b",
      bgAlt: "#172414",
      fg: "#eef6e8",
      muted: "#aec2a4",
      line: "#31442c",
      accent: "#9fd27e",
      accentInk: "#14260d",
      glow: "rgba(159, 210, 126, 0.13)",
    },
    heroLight:
      "linear-gradient(130deg, rgba(55,109,43,.15), transparent 50%), radial-gradient(circle at 83% 10%, rgba(240,181,61,.27), transparent 35%)",
    heroDark:
      "linear-gradient(130deg, rgba(159,210,126,.14), transparent 50%), radial-gradient(circle at 83% 10%, rgba(240,181,61,.12), transparent 35%)",
  },
  {
    id: "rose",
    label: "Rosado",
    motif: "arches",
    light: {
      bg: "#fbf4f4",
      bgAlt: "#f2e4e5",
      fg: "#321f25",
      muted: "#765d65",
      line: "#dfc8ce",
      accent: "#9b3d5a",
      accentInk: "#ffffff",
      glow: "rgba(170, 69, 99, 0.16)",
    },
    dark: {
      bg: "#1a1013",
      bgAlt: "#29191e",
      fg: "#faedf0",
      muted: "#c9a8b2",
      line: "#4b3039",
      accent: "#e894ad",
      accentInk: "#32101c",
      glow: "rgba(232, 148, 173, 0.13)",
    },
    heroLight:
      "linear-gradient(140deg, rgba(155,61,90,.15), transparent 50%), radial-gradient(circle at 82% 12%, rgba(215,158,95,.22), transparent 34%)",
    heroDark:
      "linear-gradient(140deg, rgba(232,148,173,.15), transparent 50%), radial-gradient(circle at 82% 12%, rgba(215,158,95,.11), transparent 34%)",
  },
  {
    id: "nocturne",
    label: "Nocturno",
    motif: "stars",
    light: {
      bg: "#f3f6f8",
      bgAlt: "#e4eaef",
      fg: "#182631",
      muted: "#586b78",
      line: "#c6d3db",
      accent: "#1f5f86",
      accentInk: "#ffffff",
      glow: "rgba(35, 105, 144, 0.16)",
    },
    dark: {
      bg: "#091218",
      bgAlt: "#12212b",
      fg: "#edf5f8",
      muted: "#a9bec9",
      line: "#29404e",
      accent: "#77c3e7",
      accentInk: "#09202c",
      glow: "rgba(119, 195, 231, 0.14)",
    },
    heroLight:
      "linear-gradient(135deg, rgba(31,95,134,.16), transparent 52%), radial-gradient(circle at 84% 11%, rgba(119,105,184,.20), transparent 34%)",
    heroDark:
      "linear-gradient(135deg, rgba(119,195,231,.16), transparent 52%), radial-gradient(circle at 84% 11%, rgba(119,105,184,.13), transparent 34%)",
  },
];

const DESTINATION_HINTS: Array<[RegExp, string]> = [
  [/(budapest|hungr[ií]a|hungary).*(praga|prague)|(?:praga|prague).*(budapest|hungr[ií]a|hungary)/i, "danube"],
  [/(playa|costa|coast|isla|island|miami|hawai|bali|maldiv|ibiza|mallorca|cartagena|san diego)/i, "atlantic"],
  [/(mont|alpes|alps|suiza|swiss|colorado|patagonia|andes|dolomit|nepal|canad)/i, "alpine"],
  [/(desert|desierto|arizona|utah|nevada|marrakech|sahara|jordania|jordan)/i, "canyon"],
  [/(selva|tropic|amaz|caribe|caribbean|colombia|costa rica|brasil|brazil|tailand|thailand)/i, "tropical"],
  [/(paris|parís|roma|rome|florencia|florence|venecia|venice|praga|prague|viena|vienna)/i, "rose"],
  [/(new york|nueva york|tokyo|tokio|london|londres|chicago|berlin|berlín|singapur|singapore|usa|estados unidos)/i, "metropolis"],
  [/(noche|night|aurora|islandia|iceland|finland|noruega|norway)/i, "nocturne"],
];

function hashDestination(value: string): number {
  let hash = 2166136261;
  for (const char of value.normalize("NFKD").toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function requestedPalette(visualTheme: unknown): string | null {
  if (typeof visualTheme === "string") return visualTheme.toLowerCase();
  if (!visualTheme || typeof visualTheme !== "object") return null;

  const record = visualTheme as Record<string, unknown>;
  const styleMap: Record<string, string> = {
    coastal: "atlantic",
    metropolis: "metropolis",
    historic: "terracotta",
    alpine: "alpine",
    tropical: "tropical",
    desert: "canyon",
    countryside: "alpine",
  };
  for (const key of ["style", "preset", "palette", "mood", "theme"]) {
    if (typeof record[key] === "string") {
      const requested = record[key].toLowerCase();
      return styleMap[requested] ?? requested;
    }
  }
  return null;
}

function choosePalette(destination: string, visualTheme?: unknown): ThemePalette {
  const hintedId = DESTINATION_HINTS.find(([pattern]) => pattern.test(destination))?.[1];
  if (hintedId) return PALETTES.find((palette) => palette.id === hintedId)!;

  const requested = requestedPalette(visualTheme);
  if (requested) {
    const explicit = PALETTES.find(
      (palette) =>
        palette.id === requested ||
        requested.includes(palette.id) ||
        palette.label.toLowerCase() === requested
    );
    if (explicit) return explicit;
  }

  return PALETTES[hashDestination(destination || "viaje") % PALETTES.length];
}

export function deriveTripTheme(
  destination: string,
  visualTheme?: unknown
): TripTheme {
  const normalizedDestination = destination.trim() || "Próximo destino";
  const hash = hashDestination(normalizedDestination);
  const palette = choosePalette(normalizedDestination, visualTheme);
  const motifs: TripTheme["motif"][] = [
    palette.motif,
    "contour",
    "grid",
    "waves",
    "arches",
    "stars",
  ];

  return {
    id: `${palette.id}-${hash.toString(36).slice(0, 5)}`,
    label: palette.label,
    motif: motifs[(hash >>> 4) % motifs.length],
    signature: hash.toString(36).toUpperCase().padStart(7, "0").slice(0, 7),
    originX: 18 + ((hash >>> 8) % 65),
    originY: 8 + ((hash >>> 15) % 45),
    angle: 105 + ((hash >>> 21) % 75),
    light: palette.light,
    dark: palette.dark,
    heroLight: palette.heroLight,
    heroDark: palette.heroDark,
  };
}
