"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import GeneratingState from "@/components/GeneratingState";
import ThemeToggle from "@/components/ThemeToggle";
import { extractWorkbookInBrowser } from "@/lib/excel-client";

type Status = "idle" | "reading" | "generating" | "error";

type GenerationEvent =
  | { type: "progress"; progress: number; label: string }
  | { type: "complete"; progress: 1; label: string; id: string }
  | { type: "error"; error: string };

export default function HomePage() {
  const router = useRouter();
  const controllerRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function showError(message: string) {
    setStatus("error");
    setError(message);
  }

  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setError(null);
    setProgress(0);
  }

  async function handleFile(file: File) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLastFile(file);
    setFileName(file.name);
    setError(null);
    setProgress(0.04);
    setStatus("reading");

    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const workbook = await extractWorkbookInBrowser(
        file,
        ({ progress: nextProgress, label: nextLabel }) => {
          setProgress(nextProgress);
          setLabel(nextLabel);
        },
        controller.signal
      );

      setStatus("generating");
      setProgress(0.85);
      setLabel(
        `${workbook.sheets.length} hojas listas. Afinando rutas, comidas vegetarianas, libros y planes…`
      );
      timeout = setTimeout(() => controller.abort(), 290_000);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workbook }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text();
        let errorMessage = "";
        try {
          errorMessage = (JSON.parse(raw) as { error?: string }).error ?? "";
        } catch {
          // Platform errors (including a proxy 413) may arrive as HTML/plain text.
        }
        throw new Error(
          errorMessage ||
            (response.status === 413
              ? "La guía compacta todavía es demasiado grande. Prueba dividiendo las hojas más extensas."
              : `El servidor respondió ${response.status}. Inténtalo otra vez.`)
        );
      }
      if (!response.body) throw new Error("El servidor no abrió el canal de progreso.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let tripId = "";
      const consume = (line: string) => {
        if (!line.trim()) return;
        let event: GenerationEvent;
        try {
          event = JSON.parse(line) as GenerationEvent;
        } catch {
          return;
        }
        if (event.type === "error") throw new Error(event.error);
        if (event.type === "progress") {
          setProgress((current) => Math.max(current, event.progress));
          setLabel(event.label);
        }
        if (event.type === "complete") {
          tripId = event.id;
          setProgress(1);
          setLabel(event.label);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) consume(line);
      }
      if (buffer.trim()) consume(buffer);
      if (!tripId) throw new Error("La guía se creó, pero no recibí su enlace.");

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      router.push(`/trip/${tripId}`);
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") {
        if (controllerRef.current === controller) {
          showError("La importación se canceló o tardó demasiado. Puedes reintentarlo sin cambiar el Excel.");
        }
        return;
      }
      showError(reason instanceof Error ? reason.message : "No pude procesar el archivo.");
    } finally {
      if (timeout) clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  const busy = status === "reading" || status === "generating";

  return (
    <main className="min-h-[100svh]">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70" aria-hidden>
        <div className="absolute left-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[var(--accent)] opacity-[0.10] blur-[110px]" />
        <div className="absolute bottom-[-15rem] right-[-8rem] h-[36rem] w-[36rem] rounded-full bg-amber-400 opacity-[0.08] blur-[120px]" />
      </div>

      <nav className="container-editorial flex min-h-20 items-center justify-between" aria-label="Principal">
        <Link href="/" className="group flex min-h-11 items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fg)] text-sm text-[var(--bg)] transition-transform group-hover:-rotate-6">V</span>
          <span>
            <span className="block font-display text-lg leading-none tracking-tightest">VaquitasLocas</span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">Amanda travel studio</span>
          </span>
        </Link>
        <ThemeToggle />
      </nav>

      <section className="container-editorial pb-10 pt-8 sm:pt-14 lg:pb-16 lg:pt-20">
        <div className="grid items-end gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-7 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--line)] bg-[var(--bg-alt)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">Excel → app de viaje</span>
              <span className="inline-flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                pensada para iPhone y para ir andando
              </span>
            </div>
            <h1 className="max-w-4xl pr-2 font-display text-[clamp(2.85rem,12vw,7.8rem)] leading-[0.88] tracking-[-0.055em] [overflow-wrap:anywhere]">
              Amanda, menos pestañas.
              <em className="mt-2 block pr-3 text-right text-[var(--accent)]">Más viaje.</em>
            </h1>
          </div>

          <div className="max-w-xl lg:pb-2">
            <p className="pr-2 text-lg leading-relaxed text-[var(--fg-muted)] sm:text-xl">
              Tú haces el Excel con todo el mimo del mundo. Yo lo convierto en una guía única: días, reservas, mapa, presupuesto y un Juan de bolsillo que intenta ser útil antes de ponerse coqueto.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["📚 siempre hay sitio para libros", "🥬 vegetariano de verdad", "🚶 rutas caminables", "🏋️ tiempo para entrenar"].map((item) => (
                <span key={item} className="rounded-full border border-[var(--line)] px-3 py-2 text-xs text-[var(--fg-muted)]">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-editorial py-8 sm:py-12" aria-labelledby="import-title">
        <h2 id="import-title" className="sr-only">Importar un Excel de viaje</h2>
        {busy ? (
          <GeneratingState
            fileName={fileName}
            label={label}
            progress={progress}
            phase={status === "reading" ? "reading" : "generating"}
            onCancel={cancel}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <UploadDropzone onFile={handleFile} onError={showError} />

            <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1" aria-label="Qué crea la aplicación">
              {[
                ["01", "Te lo ordeno", "Todas las hojas, no solo las primeras veinticinco filas."],
                ["02", "Te ahorro clics", "Maps, calendario, PDFs por día y acciones de cada reserva."],
                ["03", "Te acompaño", "Modo móvil, recomendaciones a tu gusto y chat contextual."],
              ].map(([number, title, description]) => (
                <article key={number} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--bg-alt)] p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--accent)]">{number}</span>
                    <span aria-hidden className="text-[var(--fg-muted)]">↗</span>
                  </div>
                  <h3 className="mt-7 font-display text-2xl tracking-tightest">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">{description}</p>
                </article>
              ))}
            </aside>
          </div>
        )}

        {status === "error" && (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[var(--accent)] bg-[var(--bg-alt)] p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Esto no salió como quería</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lastFile && (
                <button onClick={() => handleFile(lastFile)} className="btn-primary min-h-11 px-5 py-2.5">Reintentar</button>
              )}
              <button onClick={() => { setStatus("idle"); setError(null); }} className="btn-ghost min-h-11 px-5 py-2.5">Elegir otro</button>
            </div>
          </div>
        )}

        {!busy && (
          <p className="mt-5 text-center text-xs leading-relaxed text-[var(--fg-muted)]">
            El Excel se abre en este dispositivo. Enviamos solo el texto útil de las celdas para organizar la guía; el archivo original y sus imágenes no se guardan.
          </p>
        )}
      </section>

      <footer className="container-editorial pb-10 pt-14">
        <div className="rule mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--fg-muted)]">
          <span className="font-mono">VAQUITASLOCAS / 2026</span>
          <span className="font-display italic">Hecho con café colombiano, cariño y cero ganas de pelear con Excel.</span>
        </div>
      </footer>
    </main>
  );
}
