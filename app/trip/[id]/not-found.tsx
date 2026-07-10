import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center">
      <p className="section-number mb-4">404</p>
      <h1 className="display-lg text-balance">Este viaje se perdió en el camino</h1>
      <p className="mt-4 text-[var(--fg-muted)]">
        Puede que el enlace no sea correcto o que el viaje ya no exista.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Volver al inicio
      </Link>
    </main>
  );
}
