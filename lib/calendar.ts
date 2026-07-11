export type CalendarEvent = {
  title: string;
  date?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
};

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function calendarDateParts(value?: string | null): [string, string, string] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? [match[1], match[2], match[3]] : null;
}

function timeParts(value?: string | null): [string, string] | null {
  const match = /(?:^|\s)(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  return [String(hour).padStart(2, "0"), match[2]];
}

function stamp(date: [string, string, string], time?: [string, string] | null): string {
  const base = date.join("");
  return time ? `${base}T${time[0]}${time[1]}00` : base;
}

export function buildCalendarFile(event: CalendarEvent): string | null {
  const startDate = calendarDateParts(event.date);
  if (!startDate) return null;
  const endDate = calendarDateParts(event.endDate) ?? startDate;
  const startTime = timeParts(event.startTime);
  const endTime = timeParts(event.endTime);
  const timed = Boolean(startTime);
  const start = timed
    ? `DTSTART:${stamp(startDate, startTime)}`
    : `DTSTART;VALUE=DATE:${stamp(startDate)}`;
  const end = timed
    ? `DTEND:${stamp(endDate, endTime ?? startTime)}`
    : `DTEND;VALUE=DATE:${stamp(endDate)}`;
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VaquitasLocas//Amanda Travel//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${randomId}@vaquitaslocas`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    start,
    end,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
