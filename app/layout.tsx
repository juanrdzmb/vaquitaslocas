import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import AppMotionProvider from "@/components/AppMotionProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
});

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "VaquitasLocas — tus viajes, en página",
  applicationName: "VaquitasLocas",
  manifest: "/manifest.webmanifest",
  description:
    "Sube tu Excel de viaje y lo convierto en una página web editorial: itinerario, presupuesto, mapa, joyas ocultas y un chat con Juan, tu guía.",
  keywords: ["viajes", "excel", "itinerario", "mapa", "Amanda"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    title: "VaquitasLocas — tus viajes, en página",
    description:
      "Sube tu Excel de viaje y lo convierto en una página web editorial.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "VaquitasLocas",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#14140f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppMotionProvider>{children}</AppMotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
