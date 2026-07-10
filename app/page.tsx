"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import GeneratingState from "@/components/GeneratingState";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("loading");
    setFileName(file.name);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`);
      }
      if (!data.id) throw new Error("La respuesta no incluye un id de viaje.");

      router.push(`/trip/${data.id}`);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <div className="container-editorial flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl tracking-tightest">
            VaquitasLocas
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>

      {/* Hero */}
      <section className="container-editorial pt-12 pb-8 md:pt-20 md:pb-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <p className="eyebrow mb-6">Excel → página de viaje</p>
            <h1 className="display-xl text-balance">
              Tu viaje,
              <br />
              <em className="font-display italic text-[var(--accent)]">
                contado
              </em>{" "}
              como merece.
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-[var(--fg-muted)] text-balance">
              Sube el Excel que ya llevas para tu próximo viaje. Lo leo, lo
              ordeno, te busco joyas ocultas, librerías y restaurantes, y te
              monto una página web elegante lista para compartir.
            </p>
          </div>

          <div className="md:col-span-5 md:pt-6">
            <ol className="space-y-5 text-sm">
              {[
                ["01", "Subes tu Excel", "Itinerario, presupuesto, listas… todo mezclado vale."],
                ["02", "Lo ordeno todo", "Interpreto, geolocalizo y te curioseo recomendaciones."],
                ["03", "Tienes una página", "URL única con mapa, itinerario, presupuesto y Juan, tu guía."],
              ].map(([num, title, desc]) => (
                <li key={num} className="grid grid-cols-[auto_1fr] gap-4">
                  <span className="section-number">{num}</span>
                  <div>
                    <p className="font-display text-lg leading-tight tracking-tightest">
                      {title}
                    </p>
                    <p className="mt-1 text-[var(--fg-muted)]">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Upload */}
      <section className="container-editorial py-8 md:py-12">
        {status === "loading" ? (
          <GeneratingState fileName={fileName} />
        ) : (
          <div className="mx-auto max-w-2xl">
            <UploadDropzone onFile={handleFile} />
            {status === "error" && (
              <div className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--bg-alt)] p-4">
                <p className="font-mono text-xs uppercase tracking-widest2 text-[var(--accent)]">
                  Algo salió mal
                </p>
                <p className="mt-1 text-sm">{error}</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-3 text-sm underline"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-[var(--fg-muted)]">
              Tu archivo se procesa y no se guarda tal cual.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="container-editorial py-12">
        <div className="rule mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--fg-muted)]">
          <span className="font-mono">VaquitasLocas</span>
          <span className="font-display italic">Hecho con café y corazón</span>
        </div>
      </footer>
    </main>
  );
}
