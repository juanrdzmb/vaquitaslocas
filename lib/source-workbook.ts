import type {
  TripSourceWorkbook,
  WorkbookCellInput,
  WorkbookSheetInput,
} from "./schema";

export type SourceSheetKind = "days" | "food" | "bookings" | "other";

export type SourceDiningItem = {
  id: string;
  city: string;
  category: string;
  name: string;
  url?: string;
  row: number;
  column: number;
};

export function normalizeSourceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function sourceSheetKind(sheet: WorkbookSheetInput): SourceSheetKind {
  const name = normalizeSourceText(sheet.name);
  if (/restaur|comer|cafeter|brunch|bares?/.test(name)) return "food";
  if (/^dia\s*\d|\bdia\s*\d|^day\s*\d/.test(name)) return "days";
  if (/resumen|vuelo|hotel|reserva|presupuesto|budget|transport/.test(name)) {
    return "bookings";
  }
  return "other";
}

export function sourceCellCount(sheet: WorkbookSheetInput): number {
  return sheet.rows.reduce((sum, row) => sum + row.cells.length, 0);
}

export function sourceSheetSearchText(sheet: WorkbookSheetInput): string {
  return normalizeSourceText(
    `${sheet.name} ${sheet.rows
      .flatMap((row) => row.cells.map((cell) => `${cell.value} ${cell.url ?? ""}`))
      .join(" ")}`
  );
}

function looksLikeCityHeading(value: string, nextCellCount: number): boolean {
  const clean = value.trim();
  return (
    nextCellCount >= 2 &&
    clean.length >= 2 &&
    clean.length <= 48 &&
    clean === clean.toLocaleUpperCase("es") &&
    /\p{L}/u.test(clean)
  );
}

function looksLikeCategoryRow(cells: WorkbookCellInput[]): boolean {
  if (cells.length < 2) return false;
  const category = /^(?:restaurantes?|cafes?(?:\s*\/\s*pastelerias?)?|pastelerias?|br(?:unch|uch)(?:\s*\/\s*restaurante ligero)?|bar(?:es)?(?:\s*\/\s*pubs?)?|pubs?|tiendas? souvenirs?|souvenirs?)$/;
  return cells.every((cell) => category.test(normalizeSourceText(cell.value)));
}

const SOURCE_PLACE_WORDS =
  /\b(?:museo|museum|galer[ií]a|gallery|biblioteca|library|librer[ií]a|bookstore|castillo|castle|palacio|palace|plaza|puente|bridge|iglesia|church|bas[ií]lica|cathedral|catedral|sinagoga|synagogue|basti[oó]n|parque|park|jard[ií]n|garden|calle|street|avenida|torre|tower|estatua|statue|fuente|fountain|academia|hospital|mercado|market|estaci[oó]n|station|aeropuerto|airport|teatro|theatre|theater|[oó]pera|monasterio|monastery|memorial|mirador|viewpoint|termas?|baños?|baths?|isla|island|barrio|quarter|caf[eé]|bistro|bistr[oó]|s[oöő]r[oöő]z[oöő]|bar|pub|kitchen|restaurante|restaurant)\b/i;

const SOURCE_SENTENCE_START =
  /^(?:se |es |fue |durante |hoy |y |hay |no |si |como |despu[eé]s |desde |al |para |entrar |puede |suele |tard[oa] |marca |obra |custodian |fundad[oa] |diseñad[oa] |antigu[oa] |arquitectura |primer[oa]? |este |esta |estos |estas |el |la |los |las |dentro |actualmente |reserva |entradas? |paseo |bajada |ambiente |salida |famos[oa] |interior |desemboca |comer |en |puedo |atardecer |iglesia del |cervecer[ií]a del |ver primero |informaci[oó]n|qu[eé] ver|c[oó]mo llegar|horario|entrada|precio|duraci[oó]n|opciones?|zonas?|salas?|plantas?|exposici[oó]n|historia|instalaciones?|ruinas?|capillas?|murallas?|habitaciones?|restos?|reconstrucciones?|esculturas?|cafeter[ií]as? y restaurantes?)\b/i;

/**
 * Solo ofrece Maps cuando una celda parece un nombre propio de lugar. Es
 * deliberadamente conservador: el texto completo sigue visible aunque una
 * frase narrativa no reciba un botón.
 */
export function sourceCellPlaceCandidate(value: string): string | null {
  const raw = value.trim();
  const timed = /^\s*\d{1,2}(?::|\.)\d{2}(?:\s*[-–]\s*\d{1,2}(?::|\.)\d{2})?(?:\s*(?:am|pm))?\s*:\s*/i.test(raw);
  const withoutTime = raw.replace(
    /^\s*\d{1,2}(?::|\.)\d{2}(?:\s*[-–]\s*\d{1,2}(?::|\.)\d{2})?(?:\s*(?:am|pm))?\s*:\s*/i,
    ""
  );
  const structuredHeading = withoutTime.includes(":");
  const head = (structuredHeading
    ? withoutTime.slice(0, withoutTime.indexOf(":"))
    : withoutTime
  ).trim();

  if (
    head.length < 3 ||
    head.length > 76 ||
    /^https?:/i.test(head) ||
    SOURCE_SENTENCE_START.test(head) ||
    /^\d+(?:[.,]\d+)?(?:\s*(?:€|eur|h|min))?$/i.test(head) ||
    /\b(?:es|fue|hay|tiene|sirve|puedo|est[aá]|son)\b/i.test(head)
  ) {
    return null;
  }

  const words = head.split(/\s+/).filter(Boolean);
  if (words.length > 9 || /[.!?]$/.test(head)) return null;
  const hasPlaceWord =
    SOURCE_PLACE_WORDS.test(head) || /s[oöő]r[oöő]z[oöő](?:\s|$)/i.test(head);
  const titleWords = words.filter((word) =>
    /^(?:[A-ZÁÉÍÓÚÜÑČŠŽŘĚĎŤŇŁŚŹŻÖŐÄÅÆØ][\p{L}\d&.'’+-]*|[A-ZÁÉÍÓÚÜÑČŠŽŘĚĎŤŇŁŚŹŻÖŐÄÅÆØ]{2,})$/u.test(word)
  ).length;
  if (timed || structuredHeading) {
    return hasPlaceWord && titleWords >= 2 ? head : null;
  }
  return hasPlaceWord && words.length >= 2 && words.length <= 6 && titleWords >= 2
    ? head
    : null;
}

/** Convierte una hoja matricial de restaurantes sin reescribir ni una celda. */
export function diningItemsFromSheet(sheet: WorkbookSheetInput): SourceDiningItem[] {
  const items: SourceDiningItem[] = [];
  const categories = new Map<number, string>();
  let city = "Destino";
  let previousRow = 0;

  for (let index = 0; index < sheet.rows.length; index += 1) {
    const row = sheet.rows[index];
    const next = sheet.rows[index + 1];
    if (row.cells.length === 1 && looksLikeCityHeading(row.cells[0].value, next?.cells.length ?? 0)) {
      city = row.cells[0].value;
      categories.clear();
      previousRow = row.row;
      continue;
    }
    if (looksLikeCategoryRow(row.cells)) {
      categories.clear();
      for (const cell of row.cells) categories.set(cell.column, cell.value);
      previousRow = row.row;
      continue;
    }

    const rowGap = previousRow ? row.row - previousRow : 0;
    if (
      row.cells.length === 1 &&
      /^(si puedo ver|otros?|tambi[eé]n|miradores?)/i.test(row.cells[0].value.trim())
    ) {
      categories.set(row.cells[0].column, row.cells[0].value);
      previousRow = row.row;
      continue;
    }
    if (rowGap >= 4) categories.clear();

    for (const cell of row.cells) {
      const name = cell.value.trim();
      if (!name) continue;
      items.push({
        id: `${sheet.name}-${row.row}-${cell.column}`,
        city,
        category: categories.get(cell.column) ?? "Otros apuntes",
        name,
        ...(cell.url ? { url: cell.url } : {}),
        row: row.row,
        column: cell.column,
      });
    }
    previousRow = row.row;
  }
  return items;
}

export function sourceCoverage(source: TripSourceWorkbook): {
  sheets: number;
  cells: number;
  images: number;
} {
  return {
    sheets: source.sheets.length,
    cells: source.sheets.reduce((sum, sheet) => sum + sourceCellCount(sheet), 0),
    images: source.sheets.reduce((sum, sheet) => sum + (sheet.images?.length ?? 0), 0),
  };
}

function meaningfulTokens(value: string): Set<string> {
  const ignored = new Set([
    "dia", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo",
    "septiembre", "octubre", "noviembre", "diciembre", "enero", "febrero", "marzo",
    "abril", "mayo", "junio", "julio", "agosto", "alrededores", "llegada",
  ]);
  return new Set(
    normalizeSourceText(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !ignored.has(token))
  );
}

export function matchSourceSheetForDay(
  source: TripSourceWorkbook | undefined,
  day: { dayNumber: number; title: string }
): WorkbookSheetInput | undefined {
  if (!source) return undefined;
  const targetTokens = meaningfulTokens(day.title);
  let best: { sheet: WorkbookSheetInput; score: number } | undefined;
  for (const sheet of source.sheets.filter((item) => sourceSheetKind(item) === "days")) {
    const heading = sheet.rows.slice(0, 3).flatMap((row) => row.cells.map((cell) => cell.value)).join(" ");
    const sheetTokens = meaningfulTokens(`${sheet.name} ${heading}`);
    let score = 0;
    for (const token of targetTokens) if (sheetTokens.has(token)) score += 2;
    const localDay = Number(/d[ií]a\s*(\d{1,2})/i.exec(sheet.name)?.[1]);
    if (localDay === day.dayNumber) score += 3;
    if (day.dayNumber > 6 && localDay === day.dayNumber - 6) score += 1;
    const title = normalizeSourceText(day.title);
    const sheetName = normalizeSourceText(sheet.name);
    if (/budapest|buda/.test(title) && /_bu\b|budapest/.test(sheetName)) score += 5;
    if (/praga|prague/.test(title) && /_pr\b|praga/.test(sheetName)) score += 5;
    if (!best || score > best.score) best = { sheet, score };
  }
  return best && best.score > 0 ? best.sheet : undefined;
}
