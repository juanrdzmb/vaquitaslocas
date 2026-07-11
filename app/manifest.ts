import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VaquitasLocas — Amanda Travel Studio",
    short_name: "VaquitasLocas",
    description: "Tus Excel de viaje convertidos en una guía móvil personal.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f1e8",
    theme_color: "#1b1a17",
    orientation: "portrait-primary",
    lang: "es",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
