export type TripChapterHashRule = {
  id: string;
  hashes?: string[];
  prefixes?: string[];
};

export const TRIP_CHAPTER_EVENT = "vaquitas:trip-chapter-open";

export function cleanChapterHash(hash: string): string {
  const value = hash.replace(/^#/, "").trim();
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function chapterForHash(
  rules: TripChapterHashRule[],
  hash: string
): string | null {
  const target = cleanChapterHash(hash);
  if (!target) return null;

  const chapter = rules.find(
    (rule) =>
      rule.id === target ||
      rule.hashes?.includes(target) ||
      rule.prefixes?.some((prefix) => target.startsWith(prefix))
  );
  return chapter?.id ?? null;
}
