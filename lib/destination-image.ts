export type DestinationImage = {
  src: string;
  alt: string;
  sourceUrl: string;
  credit: string;
  license: string;
};

type MetadataValue = { value?: string };
type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, MetadataValue>;
  }>;
};

function cleanText(value: string | undefined, max = 160): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function searchTerm(destination: string): string {
  const cleaned = destination.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const firstPlace = cleaned.split(/[,;|/·]|\s+[—–]\s+/)[0]?.trim();
  return (firstPlace || cleaned || "viaje").slice(0, 80);
}

function normalizedWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

async function englishPlaceName(place: string): Promise<string> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "langlinks",
    lllang: "en",
    lllimit: "1",
    redirects: "1",
    titles: place,
    origin: "*",
  });
  try {
    const response = await fetch(`https://es.wikipedia.org/w/api.php?${params}`, {
      headers: { "Api-User-Agent": "VaquitasLocas/1.0 (destination artwork)" },
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return place;
    const payload = (await response.json()) as {
      query?: { pages?: Array<{ langlinks?: Array<{ title?: string }> }> };
    };
    return payload.query?.pages?.[0]?.langlinks?.[0]?.title?.trim() || place;
  } catch {
    return place;
  }
}

/**
 * Recupera una fotografía libre desde Wikimedia Commons. Si Commons tarda o no
 * encuentra una foto razonable, la portada conserva el tema gráfico local.
 */
export async function getDestinationImage(destination: string): Promise<DestinationImage | null> {
  const displayPlace = searchTerm(destination);
  const query = await englishPlaceName(displayPlace);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "8",
    gsrsearch: `"${query.replace(/["\\]/g, " ")}" travel photography filetype:bitmap`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1600",
    iiextmetadatafilter: "Artist|LicenseShortName|Credit",
    iiextmetadatalanguage: "es",
    origin: "*",
  });

  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "Api-User-Agent": "VaquitasLocas/1.0 (destination artwork)" },
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(3_500),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { query?: { pages?: CommonsPage[] } };
    const pages = payload.query?.pages ?? [];
    const queryWords = normalizedWords(query);
    const page = pages.find((candidate) => {
      const title = candidate.title ?? "";
      const url = candidate.imageinfo?.[0]?.thumburl;
      const titleWords = normalizedWords(title);
      const related = queryWords.length > 0 && queryWords.every((word) => titleWords.includes(word));
      return Boolean(url) && related && !/\b(flag|map|locator|logo|seal|coat of arms|poster|diagram|painting|portrait|untitled|artwork)\b/i.test(title);
    });
    const info = page?.imageinfo?.[0];
    if (!page || !info?.thumburl || !info.descriptionurl) return null;

    const metadata = info.extmetadata ?? {};
    const credit = cleanText(metadata.Artist?.value || metadata.Credit?.value, 120) || "Wikimedia Commons";
    const license = cleanText(metadata.LicenseShortName?.value, 60) || "licencia en la fuente";
    return {
      src: info.thumburl,
      alt: `Fotografía de ${displayPlace}`,
      sourceUrl: info.descriptionurl,
      credit,
      license,
    };
  } catch {
    return null;
  }
}
