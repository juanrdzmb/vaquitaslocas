"use client";

import type {
  ExtractedWorkbook,
  WorkbookCellInput,
  WorkbookImageInput,
} from "./schema";
import { WORKBOOK_LIMITS } from "./workbook";

export type WorkbookImportProgress = {
  progress: number;
  label: string;
};

type ProgressCallback = (state: WorkbookImportProgress) => void;

type SheetCell = {
  v?: unknown;
  w?: string;
  l?: { Target?: string };
};

const SUPPORTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export function isSupportedWorkbook(file: File): boolean {
  const lower = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function displayCellValue(cell: SheetCell): string {
  if (typeof cell.w === "string" && cell.w.trim()) return cell.w;
  if (cell.v instanceof Date) return cell.v.toISOString();
  if (typeof cell.v === "boolean") return cell.v ? "Sí" : "No";
  if (cell.v == null) return "";
  return String(cell.v);
}

function parseXml(value: string): XMLDocument | null {
  const document = new DOMParser().parseFromString(value, "application/xml");
  return document.getElementsByTagName("parsererror").length ? null : document;
}

function elementsByLocalName(
  root: Document | Element,
  localName: string
): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", localName));
}

function attributeByLocalName(element: Element, localName: string): string | null {
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) return attribute.value;
  }
  return null;
}

function relationshipMap(document: XMLDocument | null): Map<string, string> {
  const relationships = new Map<string, string>();
  if (!document) return relationships;
  for (const element of elementsByLocalName(document, "Relationship")) {
    const id = element.getAttribute("Id");
    const target = element.getAttribute("Target");
    if (id && target) relationships.set(id, target);
  }
  return relationships;
}

function normalizeZipPath(basePath: string, target: string): string {
  if (target.startsWith("/")) return target.replace(/^\/+/, "");
  const parts = [...basePath.split("/").slice(0, -1), ...target.split("/")];
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return normalized.join("/");
}

function relationshipsPath(path: string): string {
  const parts = path.split("/");
  const fileName = parts.pop() ?? "";
  return [...parts, "_rels", `${fileName}.rels`].join("/");
}

function imageMime(path: string): string | null {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function extractEmbeddedImages(
  buffer: ArrayBuffer,
  sheetNames: string[]
): Promise<Map<string, WorkbookImageInput[]>> {
  const result = new Map<string, WorkbookImageInput[]>();
  try {
    const { strFromU8, unzipSync } = await import("fflate");
    const files = unzipSync(new Uint8Array(buffer));
    const xmlAt = (path: string) => {
      const bytes = files[path];
      return bytes ? parseXml(strFromU8(bytes)) : null;
    };

    const workbookDocument = xmlAt("xl/workbook.xml");
    const workbookRelationships = relationshipMap(
      xmlAt("xl/_rels/workbook.xml.rels")
    );
    const sheetPaths = new Map<string, string>();
    if (workbookDocument) {
      for (const sheet of elementsByLocalName(workbookDocument, "sheet")) {
        const name = sheet.getAttribute("name");
        const relationshipId = attributeByLocalName(sheet, "id");
        const target = relationshipId
          ? workbookRelationships.get(relationshipId)
          : undefined;
        if (name && target) {
          sheetPaths.set(name, normalizeZipPath("xl/workbook.xml", target));
        }
      }
    }

    let imageCount = 0;
    let imageBytes = 0;
    for (let sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex += 1) {
      if (imageCount >= WORKBOOK_LIMITS.maxImages) break;
      const sheetName = sheetNames[sheetIndex];
      const sheetPath =
        sheetPaths.get(sheetName) ?? `xl/worksheets/sheet${sheetIndex + 1}.xml`;
      const sheetDocument = xmlAt(sheetPath);
      const sheetRelationships = relationshipMap(xmlAt(relationshipsPath(sheetPath)));
      if (!sheetDocument || !sheetRelationships.size) continue;

      const sheetImages: WorkbookImageInput[] = [];
      for (const drawing of elementsByLocalName(sheetDocument, "drawing")) {
        const relationshipId = attributeByLocalName(drawing, "id");
        const target = relationshipId
          ? sheetRelationships.get(relationshipId)
          : undefined;
        if (!target) continue;
        const drawingPath = normalizeZipPath(sheetPath, target);
        const drawingDocument = xmlAt(drawingPath);
        const drawingRelationships = relationshipMap(
          xmlAt(relationshipsPath(drawingPath))
        );
        if (!drawingDocument) continue;

        const anchors = [
          ...elementsByLocalName(drawingDocument, "oneCellAnchor"),
          ...elementsByLocalName(drawingDocument, "twoCellAnchor"),
          ...elementsByLocalName(drawingDocument, "absoluteAnchor"),
        ];
        for (const anchor of anchors) {
          if (imageCount >= WORKBOOK_LIMITS.maxImages) break;
          const blip = elementsByLocalName(anchor, "blip")[0];
          const embeddedId = blip ? attributeByLocalName(blip, "embed") : null;
          const mediaTarget = embeddedId
            ? drawingRelationships.get(embeddedId)
            : undefined;
          if (!mediaTarget) continue;
          const mediaPath = normalizeZipPath(drawingPath, mediaTarget);
          const bytes = files[mediaPath];
          const mime = imageMime(mediaPath);
          if (!bytes || !mime || bytes.length > WORKBOOK_LIMITS.maxImageBytes) continue;
          if (imageBytes + bytes.length > WORKBOOK_LIMITS.maxImageBytesTotal) break;

          const from = elementsByLocalName(anchor, "from")[0];
          const row = Number(elementsByLocalName(from ?? anchor, "row")[0]?.textContent ?? 0) + 1;
          const column = Number(elementsByLocalName(from ?? anchor, "col")[0]?.textContent ?? 0);
          const properties = elementsByLocalName(anchor, "cNvPr")[0];
          const alt =
            properties?.getAttribute("descr") ||
            properties?.getAttribute("name") ||
            "Imagen incrustada en el Excel";

          imageCount += 1;
          imageBytes += bytes.length;
          sheetImages.push({
            id: `${sheetName}-image-${imageCount}`,
            row: Number.isFinite(row) && row > 0 ? row : 1,
            column: Number.isFinite(column) && column >= 0 ? column : 0,
            dataUrl: `data:${mime};base64,${bytesToBase64(bytes)}`,
            alt,
          });
        }
      }
      if (sheetImages.length) result.set(sheetName, sheetImages);
    }
  } catch {
    // Las celdas siguen siendo la fuente principal si un XLSX usa dibujos no estándar.
  }
  return result;
}

export async function extractWorkbookInBrowser(
  file: File,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<ExtractedWorkbook> {
  if (!isSupportedWorkbook(file)) {
    throw new Error("Formato no compatible. Usa .xlsx, .xls o .csv.");
  }
  if (file.size > WORKBOOK_LIMITS.maxSourceBytes) {
    throw new Error("El archivo supera 40 MB. Quita imágenes pesadas o divide el libro.");
  }
  if (file.size === 0) throw new Error("El archivo está vacío.");

  onProgress?.({ progress: 0.08, label: "Abriendo el archivo en este dispositivo…" });
  const XLSX = await import("xlsx");
  if (signal?.aborted) throw new DOMException("Importación cancelada", "AbortError");

  const buffer = await file.arrayBuffer();
  onProgress?.({ progress: 0.22, label: "Separando datos de imágenes y formato…" });
  if (signal?.aborted) throw new DOMException("Importación cancelada", "AbortError");

  let book: ReturnType<typeof XLSX.read>;
  try {
    book = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellText: true,
      dense: false,
    });
  } catch {
    throw new Error("No pude abrir el Excel. Puede estar protegido, dañado o usar un formato no compatible.");
  }

  if (!book.SheetNames.length) throw new Error("El archivo no contiene hojas.");
  const sheets: ExtractedWorkbook["sheets"] = [];

  for (let sheetIndex = 0; sheetIndex < book.SheetNames.length; sheetIndex += 1) {
    if (signal?.aborted) throw new DOMException("Importación cancelada", "AbortError");
    const name = book.SheetNames[sheetIndex];
    const sheet = book.Sheets[name] as unknown as Record<string, SheetCell>;
    const rows = new Map<number, WorkbookCellInput[]>();

    for (const [address, cell] of Object.entries(sheet)) {
      if (address.startsWith("!") || !cell || typeof cell !== "object") continue;
      let decoded: { r: number; c: number };
      try {
        decoded = XLSX.utils.decode_cell(address);
      } catch {
        continue;
      }

      const value = displayCellValue(cell)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .trim();
      const url = typeof cell.l?.Target === "string" ? cell.l.Target : undefined;
      if (!value && !url) continue;

      const current = rows.get(decoded.r + 1) ?? [];
      current.push({
        column: decoded.c,
        value: value.slice(0, WORKBOOK_LIMITS.maxCellChars),
        ...(url ? { url } : {}),
      });
      rows.set(decoded.r + 1, current);
    }

    const normalizedRows = [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([row, cells]) => ({
        row,
        cells: cells.sort((a, b) => a.column - b.column),
      }));

    if (normalizedRows.length) sheets.push({ name, rows: normalizedRows });
    const sheetProgress = (sheetIndex + 1) / book.SheetNames.length;
    onProgress?.({
      progress: 0.25 + sheetProgress * 0.55,
      label: `Leyendo “${name}” (${sheetIndex + 1}/${book.SheetNames.length})…`,
    });
  }

  if (!sheets.length) throw new Error("No encontré celdas con contenido en el archivo.");
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    onProgress?.({ progress: 0.81, label: "Conservando también lo que pegaste dentro de las hojas…" });
    const images = await extractEmbeddedImages(buffer, book.SheetNames);
    for (const sheet of sheets) {
      const sheetImages = images.get(sheet.name);
      if (sheetImages?.length) sheet.images = sheetImages;
    }
  }
  onProgress?.({ progress: 0.84, label: "Preparando las hojas para Amanda…" });
  return { fileName: file.name, fileSize: file.size, sheets };
}
