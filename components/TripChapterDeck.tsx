"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BedIcon,
  BookOpenTextIcon,
  CaretDownIcon,
  MapTrifoldIcon,
  PathIcon,
  SparkleIcon,
  TableIcon,
} from "@phosphor-icons/react";
import {
  chapterForHash,
  cleanChapterHash,
  TRIP_CHAPTER_EVENT,
  type TripChapterHashRule,
} from "@/lib/trip-chapters";

export type TripChapterIcon =
  | "source"
  | "logistics"
  | "itinerary"
  | "map"
  | "ideas";

export type TripChapterItem = TripChapterHashRule & {
  title: string;
  description: string;
  meta: string;
  icon: TripChapterIcon;
  content: ReactNode;
};

function ChapterIcon({ name }: { name: TripChapterIcon }) {
  const props = { size: 24, weight: "duotone" as const, "aria-hidden": true };
  if (name === "source") return <TableIcon {...props} />;
  if (name === "logistics") return <BedIcon {...props} />;
  if (name === "itinerary") return <PathIcon {...props} />;
  if (name === "map") return <MapTrifoldIcon {...props} />;
  return <SparkleIcon {...props} />;
}

function scrollToHashTarget(hash: string): void {
  const id = cleanChapterHash(hash);
  if (!id) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    })
  );
}

export default function TripChapterDeck({
  chapters,
  initialChapterId,
}: {
  chapters: TripChapterItem[];
  initialChapterId?: string | null;
}) {
  const validInitial =
    initialChapterId === null
      ? null
      : chapters.some((chapter) => chapter.id === initialChapterId)
        ? initialChapterId ?? null
        : chapters[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(validInitial);
  const [openedIds, setOpenedIds] = useState<Set<string>>(
    () => new Set(validInitial ? [validInitial] : [])
  );
  const rules = useMemo<TripChapterHashRule[]>(
    () =>
      chapters.map(({ id, hashes, prefixes }) => ({ id, hashes, prefixes })),
    [chapters]
  );

  useEffect(() => {
    const openFromHash = () => {
      const chapterId = chapterForHash(rules, window.location.hash);
      if (!chapterId) return;
      setOpenedIds((current) => new Set(current).add(chapterId));
      setActiveId(chapterId);
      scrollToHashTarget(window.location.hash);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [rules]);

  useEffect(() => {
    if (!activeId) return;
    requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent(TRIP_CHAPTER_EVENT, { detail: { id: activeId } })
      );
    });
  }, [activeId]);

  if (!chapters.length) return null;

  function toggleChapter(chapterId: string) {
    setOpenedIds((current) => new Set(current).add(chapterId));
    setActiveId((current) => {
      if (current === chapterId) {
        const hashChapter = chapterForHash(rules, window.location.hash);
        if (hashChapter === chapterId) {
          history.replaceState(null, "", `${location.pathname}${location.search}`);
        }
        return null;
      }
      return chapterId;
    });
  }

  return (
    <section className="trip-chapter-deck" aria-labelledby="trip-chapters-title">
      <div className="container-editorial trip-chapter-deck__intro">
        <span className="kinetic-label">
          <BookOpenTextIcon size={17} weight="duotone" aria-hidden /> Índice del viaje
        </span>
        <div>
          <h2 id="trip-chapters-title" className="display-md">
            Abre solo lo que necesitas
          </h2>
          <p>
            El viaje sigue entero, pero ya no tienes que atravesar una tesis doctoral
            para encontrar el hotel. Un capítulo abierto cada vez; hasta yo puedo con eso.
          </p>
        </div>
      </div>

      <div className="container-editorial trip-chapter-deck__list">
        {chapters.map((chapter, index) => {
          const open = activeId === chapter.id;
          const mounted = openedIds.has(chapter.id);
          const buttonId = `chapter-button-${chapter.id}`;
          const panelId = `chapter-panel-${chapter.id}`;
          return (
            <section
              key={chapter.id}
              id={chapter.id}
              className="trip-chapter"
              data-open={open || undefined}
            >
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggleChapter(chapter.id)}
                  className="trip-chapter__button"
                >
                  <span className="trip-chapter__number" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="trip-chapter__icon" aria-hidden>
                    <ChapterIcon name={chapter.icon} />
                  </span>
                  <span className="trip-chapter__copy">
                    <strong>{chapter.title}</strong>
                    <small>{chapter.description}</small>
                  </span>
                  <span className="trip-chapter__meta">{chapter.meta}</span>
                  <CaretDownIcon
                    className="trip-chapter__caret"
                    size={22}
                    weight="bold"
                    aria-hidden
                  />
                </button>
              </h3>

              {mounted && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!open}
                  className="trip-chapter__panel"
                >
                  {chapter.content}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
