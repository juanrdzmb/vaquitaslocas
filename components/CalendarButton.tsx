"use client";

import {
  buildCalendarFile,
  calendarDateParts,
  type CalendarEvent,
} from "@/lib/calendar";

type Props = {
  event: CalendarEvent;
  label?: string;
  className?: string;
};

export default function CalendarButton({ event, label = "Calendario", className = "" }: Props) {
  const available = Boolean(calendarDateParts(event.date));
  if (!available) return null;

  function download() {
    const content = buildCalendarFile(event);
    if (!content) return;
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "viaje"}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 text-xs font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${className}`}
    >
      <span aria-hidden>＋</span>
      {label}
    </button>
  );
}
