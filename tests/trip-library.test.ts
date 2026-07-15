import { describe, expect, it } from "vitest";
import { parseTripLibrary, rememberTripCover, type SavedTripCover } from "../lib/trip-library";

const cover: SavedTripCover = {
  id: "abc_123",
  title: "Budapest y Praga",
  destination: "Budapest · Praga",
  startDate: null,
  endDate: null,
  createdAt: 10,
  lastOpenedAt: 20,
};

const coverImage = {
  src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Budapest.jpg/1200px-Budapest.jpg",
  alt: "Fotografía de Budapest",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Budapest.jpg",
  credit: "Una fotógrafa",
  license: "CC BY-SA 4.0",
};

describe("travel library", () => {
  it("deduplicates a book and keeps the latest opening first", () => {
    const next = rememberTripCover(
      [{ ...cover, lastOpenedAt: 12 }, { ...cover, id: "otro", lastOpenedAt: 18 }],
      { ...cover, lastOpenedAt: 30 }
    );
    expect(next.map((item) => item.id)).toEqual(["abc_123", "otro"]);
    expect(next[0].lastOpenedAt).toBe(30);
  });

  it("ignores corrupt or unsafe stored records", () => {
    const parsed = parseTripLibrary(JSON.stringify([cover, { ...cover, id: "../../x" }, null]));
    expect(parsed).toEqual([cover]);
  });

  it("keeps a validated Wikimedia photograph with its attribution", () => {
    const withImage = { ...cover, coverImage };
    expect(parseTripLibrary(JSON.stringify([withImage]))).toEqual([withImage]);
  });

  it("drops cover images from untrusted hosts without losing the book", () => {
    const parsed = parseTripLibrary(
      JSON.stringify([
        {
          ...cover,
          coverImage: {
            ...coverImage,
            src: "https://example.com/tracker.jpg",
            sourceUrl: "javascript:alert(1)",
          },
        },
      ])
    );
    expect(parsed).toEqual([cover]);
  });

  it("preserves the previous photograph when Commons is temporarily unavailable", () => {
    const next = rememberTripCover(
      [{ ...cover, coverImage }],
      { ...cover, title: "Budapest vuelve a la estantería", lastOpenedAt: 40 }
    );
    expect(next[0].coverImage).toEqual(coverImage);
    expect(next[0].title).toBe("Budapest vuelve a la estantería");
  });
});
