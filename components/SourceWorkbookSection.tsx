"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  AirplaneTiltIcon,
  CaretDownIcon,
  FileTextIcon,
  ForkKnifeIcon,
  ImageSquareIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NotebookIcon,
  SealCheckIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import type {
  TripSourceWorkbook,
  WorkbookCellInput,
  WorkbookSheetInput,
} from "@/lib/schema";
import {
  diningItemsFromSheet,
  normalizeSourceText,
  sourceCellCount,
  sourceCellPlaceCandidate,
  sourceCoverage,
  sourceSheetKind,
  sourceSheetSearchText,
  type SourceSheetKind,
} from "@/lib/source-workbook";
import { googleMapsUrl } from "@/lib/utils";

type Tab = {
  id: SourceSheetKind;
  label: string;
  shortLabel: string;
  icon: typeof NotebookIcon;
};

const TABS: Tab[] = [
  { id: "days", label: "Días completos", shortLabel: "Días", icon: NotebookIcon },
  { id: "food", label: "Restaurantes", shortLabel: "Comer", icon: ForkKnifeIcon },
  { id: "bookings", label: "Reservas y resumen", shortLabel: "Reservas", icon: AirplaneTiltIcon },
  { id: "other", label: "Otras hojas", shortLabel: "Otras", icon: SquaresFourIcon },
];

function safeHttpUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function sourceLink(cell: WorkbookCellInput): string | null {
  return safeHttpUrl(cell.url) ?? safeHttpUrl(cell.value);
}

function destinationHint(sheet: WorkbookSheetInput, destination: string): string {
  const name = normalizeSourceText(sheet.name);
  if (/(?:_|\b)bu(?:\b|$)|budapest/.test(name)) return "Budapest, Hungría";
  if (/(?:_|\b)pr(?:\b|$)|praga|prague/.test(name)) return "Praga, República Checa";
  return destination;
}

function SourceCell({
  cell,
  sheet,
  destination,
}: {
  cell: WorkbookCellInput;
  sheet: WorkbookSheetInput;
  destination: string;
}) {
  const href = sourceLink(cell);
  const candidate = sourceCellPlaceCandidate(cell.value);
  const mapsUrl = candidate
    ? googleMapsUrl({ query: `${candidate}, ${destinationHint(sheet, destination)}` })
    : null;
  return (
    <div className="min-w-0">
      {href && href === safeHttpUrl(cell.value) ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-[var(--accent)] underline decoration-[var(--outline)] underline-offset-4"
        >
          {cell.value}
        </a>
      ) : (
        <p className="whitespace-pre-wrap break-words">{cell.value}</p>
      )}
      {(href || mapsUrl) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {href && href !== safeHttpUrl(cell.value) && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="kinetic-link-button"
            >
              <FileTextIcon size={15} weight="duotone" aria-hidden /> Abrir enlace original
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kinetic-link-button"
            >
              <MapPinIcon size={15} weight="duotone" aria-hidden /> Ver lugar
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function SourceRows({
  sheet,
  destination,
  query,
}: {
  sheet: WorkbookSheetInput;
  destination: string;
  query: string;
}) {
  const normalizedQuery = normalizeSourceText(query);
  const rows = normalizedQuery
    ? sheet.rows.filter((row) =>
        normalizeSourceText(
          row.cells.map((cell) => `${cell.value} ${cell.url ?? ""}`).join(" ")
        ).includes(normalizedQuery)
      )
    : sheet.rows;

  return (
    <div className="source-rows">
      {rows.map((row, index) => {
        const gap = index > 0 ? row.row - rows[index - 1].row : 0;
        const firstValue = row.cells[0]?.value.trim() ?? "";
        const isSection =
          row.cells.length === 1 &&
          (/:$/.test(firstValue) || /^\d{1,2}(?::|\.)\d{2}/.test(firstValue));
        return (
          <div key={row.row} className={gap > 1 ? "source-row source-row--gap" : "source-row"}>
            <span className="source-row__number" aria-label={`Fila ${row.row}`}>
              {String(row.row).padStart(2, "0")}
            </span>
            <div
              className={`source-row__cells ${isSection ? "source-row__cells--section" : ""}`}
              style={{ gridTemplateColumns: `repeat(${Math.min(row.cells.length, 3)}, minmax(0, 1fr))` }}
            >
              {row.cells.map((cell) => (
                <SourceCell
                  key={`${row.row}-${cell.column}`}
                  cell={cell}
                  sheet={sheet}
                  destination={destination}
                />
              ))}
            </div>
          </div>
        );
      })}
      {!rows.length && (
        <p className="rounded-[var(--shape-lg)] bg-[var(--surface-container)] p-5 text-sm text-[var(--on-surface-variant)]">
          No aparece esa palabra en esta hoja.
        </p>
      )}
    </div>
  );
}

function SourceImages({ sheet }: { sheet: WorkbookSheetInput }) {
  if (!sheet.images?.length) return null;
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {sheet.images.map((image) => (
        <figure
          key={image.id}
          className="overflow-hidden rounded-[var(--shape-xl)] bg-[var(--surface-container)] p-2"
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(var(--shape-xl)-0.5rem)] bg-white">
            <Image
              src={image.dataUrl}
              alt={image.alt || "Imagen incrustada en el Excel"}
              fill
              unoptimized
              sizes="(max-width: 640px) 92vw, 42vw"
              className="object-contain"
            />
          </div>
          <figcaption className="flex items-center gap-2 px-2 pb-1 pt-3 text-xs text-[var(--on-surface-variant)]">
            <ImageSquareIcon size={16} weight="duotone" aria-hidden />
            Imagen que pegaste cerca de la fila {image.row}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function SourceSheetCard({
  sheet,
  destination,
  open,
  onToggle,
  query,
}: {
  sheet: WorkbookSheetInput;
  destination: string;
  open: boolean;
  onToggle: () => void;
  query: string;
}) {
  const reduceMotion = useReducedMotion();
  const title = sheet.rows[0]?.cells[0]?.value || sheet.name;
  const panelId = `source-sheet-${sheet.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <article className="source-sheet-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="source-sheet-card__button"
      >
        <span className="source-sheet-card__index" aria-hidden>
          {String(sourceCellCount(sheet)).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-xs font-semibold text-[var(--accent)]">{sheet.name}</span>
          <span className="mt-1 block truncate font-display text-xl tracking-tightest sm:text-2xl">
            {title}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
          className="source-sheet-card__caret"
          aria-hidden
        >
          <CaretDownIcon size={20} weight="bold" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 31 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--outline-variant)] p-4 sm:p-6">
              <SourceRows sheet={sheet} destination={destination} query={query} />
              <SourceImages sheet={sheet} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function DiningView({
  sheets,
  destination,
  query,
}: {
  sheets: WorkbookSheetInput[];
  destination: string;
  query: string;
}) {
  const normalizedQuery = normalizeSourceText(query);
  const items = sheets
    .flatMap(diningItemsFromSheet)
    .filter((item) =>
      normalizedQuery
        ? normalizeSourceText(`${item.city} ${item.category} ${item.name}`).includes(normalizedQuery)
        : true
    );
  const cities = [...new Set(items.map((item) => item.city))];

  return (
    <div className="grid gap-8">
      {cities.map((city) => {
        const cityItems = items.filter((item) => item.city === city);
        const categories = [...new Set(cityItems.map((item) => item.category))];
        const cityId = `dining-${normalizeSourceText(city).replace(/\s/g, "-")}`;
        return (
          <section key={city} aria-labelledby={cityId}>
            <details
              className="source-dining-city"
              key={`${city}-${normalizedQuery ? "search" : "closed"}`}
              open={normalizedQuery ? true : undefined}
            >
              <summary>
                <span>
                  <small>Ciudad</small>
                  <strong id={cityId}>{city}</strong>
                </span>
                <span className="kinetic-label">{cityItems.length} apuntados</span>
                <CaretDownIcon className="source-dining-caret" size={20} weight="bold" aria-hidden />
              </summary>
              <div className="source-dining-city__content">
              {categories.map((category) => (
                <details
                  key={`${city}-${category}-${normalizedQuery ? "search" : "closed"}`}
                  className="source-dining-category"
                  open={normalizedQuery ? true : undefined}
                >
                  <summary>
                    <span>{category}</span>
                    <small>
                      {cityItems.filter((item) => item.category === category).length}
                    </small>
                    <CaretDownIcon className="source-dining-caret" size={17} weight="bold" aria-hidden />
                  </summary>
                  <div className="source-dining-category__content grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cityItems
                      .filter((item) => item.category === category)
                      .map((item) => {
                        const queryName = item.name.split(":", 1)[0].trim();
                        const placeUrl = googleMapsUrl({
                          query: `${queryName}, ${city === "Destino" ? destination : city}`,
                        });
                        return (
                          <article key={item.id} className="source-dining-item">
                            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {item.name}
                            </p>
                            <a
                              href={item.url || placeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir ${item.name} en ${item.url ? "su enlace" : "Google Maps"}`}
                              className="source-dining-item__map"
                            >
                              <MapPinIcon size={18} weight="duotone" aria-hidden />
                            </a>
                          </article>
                        );
                      })}
                  </div>
                </details>
              ))}
              </div>
            </details>
          </section>
        );
      })}
      {!items.length && (
        <p className="rounded-[var(--shape-xl)] bg-[var(--surface-container)] p-7 text-center text-sm text-[var(--on-surface-variant)]">
          No encontré esa palabra entre los sitios que apuntaste.
        </p>
      )}
      {sheets.map((sheet) => <SourceImages key={sheet.name} sheet={sheet} />)}
    </div>
  );
}

export default function SourceWorkbookSection({
  source,
  destination,
  sectionId = "excel-amanda",
}: {
  source?: TripSourceWorkbook;
  destination: string;
  sectionId?: string;
}) {
  const availableTabs = useMemo(
    () =>
      TABS.filter((tab) => source?.sheets.some((sheet) => sourceSheetKind(sheet) === tab.id)),
    [source]
  );
  const [activeTab, setActiveTab] = useState<SourceSheetKind>(availableTabs[0]?.id ?? "days");
  const [openSheet, setOpenSheet] = useState("");
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSourceText(query);

  const tabSheets = useMemo(
    () =>
      (source?.sheets ?? []).filter(
        (sheet) =>
          sourceSheetKind(sheet) === activeTab &&
          (!normalizedQuery || sourceSheetSearchText(sheet).includes(normalizedQuery))
      ),
    [activeTab, normalizedQuery, source]
  );

  useEffect(() => {
    if (!tabSheets.some((sheet) => sheet.name === openSheet)) {
      setOpenSheet(
        normalizedQuery && tabSheets.length === 1 ? tabSheets[0]?.name ?? "" : ""
      );
    }
  }, [normalizedQuery, openSheet, tabSheets]);

  if (!source?.sheets.length) return null;
  const coverage = sourceCoverage(source);

  return (
    <section id={sectionId} className="source-workbook-section scroll-mt-24 py-14 md:py-20">
      <div className="container-editorial">
        <div className="source-workbook-hero">
          <div>
            <span className="kinetic-label kinetic-label--success">
              <SealCheckIcon size={16} weight="fill" aria-hidden /> 100% del texto original
            </span>
            <p className="eyebrow mb-3 mt-5">Tu Excel, sin el síndrome de la tijera creativa</p>
            <h2 className="display-md">Todo lo que apuntaste, Amanda</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--on-surface-variant)] sm:text-base">
              Esto sale directo de tus celdas: no lo resumí, no lo adorné y no decidí que ocho líneas de un recorrido eran “demasiada información”. Qué detalle el mío. 🙂
            </p>
          </div>
          <div className="source-workbook-coverage" aria-label="Cobertura del archivo original">
            <strong>{coverage.cells}</strong>
            <span>celdas visibles</span>
            <small>{coverage.sheets} hojas{coverage.images ? ` · ${coverage.images} imágenes` : ""}</small>
          </div>
        </div>

        <div className="source-workbook-toolbar">
          <div className="source-tabs" role="tablist" aria-label="Contenido original del Excel">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const count = source.sheets.filter((sheet) => sourceSheetKind(sheet) === tab.id).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className="source-tab"
                  data-active={active || undefined}
                >
                  <Icon size={19} weight={active ? "fill" : "duotone"} aria-hidden />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <small>{count}</small>
                </button>
              );
            })}
          </div>
          <label className="source-search">
            <MagnifyingGlassIcon size={20} weight="duotone" aria-hidden />
            <span className="sr-only">Buscar en todo el Excel</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Castillo, café, reserva…"
              type="search"
            />
          </label>
        </div>

        <div className="mt-5" role="tabpanel">
          {activeTab === "food" ? (
            <DiningView sheets={tabSheets} destination={destination} query={query} />
          ) : (
            <div className="grid gap-3">
              {tabSheets.map((sheet) => (
                <SourceSheetCard
                  key={sheet.name}
                  sheet={sheet}
                  destination={destination}
                  open={openSheet === sheet.name}
                  onToggle={() => setOpenSheet((current) => (current === sheet.name ? "" : sheet.name))}
                  query={query}
                />
              ))}
              {!tabSheets.length && (
                <p className="rounded-[var(--shape-xl)] bg-[var(--surface-container)] p-8 text-center text-sm text-[var(--on-surface-variant)]">
                  No encontré esa palabra en esta parte del Excel.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
