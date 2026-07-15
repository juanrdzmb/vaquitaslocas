"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  BooksIcon,
  LockKeyIcon,
} from "@phosphor-icons/react";
import { deriveTripTheme } from "@/lib/trip-theme";
import {
  parseTripLibrary,
  TRIP_LIBRARY_EVENT,
  TRIP_LIBRARY_STORAGE_KEY,
  type SavedTripCover,
} from "@/lib/trip-library";
import { formatDate } from "@/lib/utils";

type BookStyle = CSSProperties & Record<`--book-${string}`, string | number>;

function BookCover({ book, index }: { book: SavedTripCover; index: number }) {
  const reduceMotion = useReducedMotion();
  const theme = useMemo(
    () => deriveTripTheme(book.destination, book.visualTheme),
    [book.destination, book.visualTheme]
  );
  const style: BookStyle = {
    "--book-bg": theme.light.bg,
    "--book-ink": theme.light.fg,
    "--book-accent": theme.light.accent,
    "--book-line": theme.light.line,
    "--book-glow": theme.light.glow,
    "--book-tilt": `${((index % 5) - 2) * 0.65}deg`,
  };
  const dates = [formatDate(book.startDate), formatDate(book.endDate)]
    .filter((value, position, values) => value && values.indexOf(value) === position)
    .join(" — ");

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 28, rotate: -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 22, delay: Math.min(index * 0.05, 0.25) }}
      className="travel-book-wrap"
      style={style}
    >
      <Link
        href={`/trip/${encodeURIComponent(book.id)}`}
        className="travel-book"
        data-book-motif={theme.motif}
        data-has-image={book.coverImage ? true : undefined}
        aria-label={`Abrir ${book.title}, viaje a ${book.destination}`}
      >
        <span className="travel-book__spine" aria-hidden>
          <span>VL</span>
          <small>{String(index + 1).padStart(2, "0")}</small>
        </span>
        <span className="travel-book__cover">
          {book.coverImage && (
            <span className="travel-book__photo" aria-hidden>
              <Image
                src={book.coverImage.src}
                alt=""
                fill
                sizes="(max-width: 480px) 68vw, (max-width: 1024px) 36vw, 19rem"
                className="object-cover"
              />
            </span>
          )}
          <span className="travel-book__edition">Amanda travel library · {theme.signature}</span>
          <span className="travel-book__motif" aria-hidden><i /><i /><i /></span>
          <strong>{book.title}</strong>
          <span className="travel-book__meta">
            <em>{book.destination}</em>
            <small>{dates || "Edición sin fecha"}</small>
          </span>
        </span>
        <span className="travel-book__pages" aria-hidden />
      </Link>
      {book.coverImage && (
        <a
          href={book.coverImage.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="travel-book__credit"
          aria-label={`Crédito de la fotografía de ${book.destination}`}
        >
          <span>Foto: {book.coverImage.credit} · {book.coverImage.license}</span>
          <ArrowSquareOutIcon size={12} weight="bold" aria-hidden />
        </a>
      )}
    </motion.li>
  );
}

export default function TravelLibrary() {
  const [books, setBooks] = useState<SavedTripCover[]>([]);
  const railRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const read = () => {
      try {
        setBooks(parseTripLibrary(localStorage.getItem(TRIP_LIBRARY_STORAGE_KEY)));
      } catch {
        setBooks([]);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(TRIP_LIBRARY_EVENT, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(TRIP_LIBRARY_EVENT, read);
    };
  }, []);

  function move(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.min(window.innerWidth * 0.78, 620),
      behavior: "smooth",
    });
  }

  return (
    <section id="biblioteca" className="travel-library scroll-mt-6" aria-labelledby="library-title">
      <div className="container-editorial">
        <div className="travel-library__header">
          <div>
            <span className="kinetic-label"><BooksIcon size={17} weight="duotone" aria-hidden /> Archivo personal</span>
            <h2 id="library-title" className="mt-5 font-display text-4xl leading-[0.95] tracking-[-0.055em] sm:text-6xl">
              La biblioteca<br /><em>de Amanda.</em>
            </h2>
          </div>
          <div className="max-w-md">
            <p className="text-sm leading-relaxed text-[var(--fg-muted)] sm:text-base">
              Cada viaje se guarda como una edición distinta. Mucho más digno que una carpeta llamada “FINAL_final_ahora_sí”.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-[var(--fg-muted)]">
              <LockKeyIcon size={16} weight="duotone" aria-hidden /> Privada en este dispositivo; tus viajes no se publican en una galería.
            </p>
          </div>
        </div>

        {books.length ? (
          <div className="travel-library__stage">
            <ul ref={railRef} className="travel-library__rail" aria-label="Viajes guardados">
              {books.map((book, index) => <BookCover key={book.id} book={book} index={index} />)}
            </ul>
            <div className="travel-library__controls" aria-label="Mover la estantería">
              <button type="button" onClick={() => move(-1)} aria-label="Libros anteriores"><ArrowLeftIcon size={21} weight="bold" /></button>
              <span>{String(books.length).padStart(2, "0")} ediciones</span>
              <button type="button" onClick={() => move(1)} aria-label="Libros siguientes"><ArrowRightIcon size={21} weight="bold" /></button>
            </div>
          </div>
        ) : (
          <div className="travel-library__empty">
            <span className="travel-library__ghost-book" aria-hidden><i /><i /><i /></span>
            <div>
              <h3>La primera portada está esperando.</h3>
              <p>Cuando abras un viaje, quedará aquí guardado para volver sin buscar el enlace entre 847 chats.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
