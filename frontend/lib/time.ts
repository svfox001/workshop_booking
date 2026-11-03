/**
 * Workshop-timezone helpers. Every time shown to staff, and every
 * datetime-local value they type, is in the workshop's timezone regardless
 * of the server's or browser's timezone. These run on the server only, and
 * the formatted strings are passed to the client, so server and client
 * renders always match.
 */

const DEFAULT_TIMEZONE = "Australia/Sydney";
const LOCALE = "en-AU";

export function workshopTimezone(): string {
  return process.env.WORKSHOP_TIMEZONE || DEFAULT_TIMEZONE;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClockIn(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of the timezone from UTC at the given instant, in milliseconds. */
function offsetAt(date: Date, timeZone: string): number {
  const wall = wallClockIn(date, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO UTC string from the API to a datetime-local value ("YYYY-MM-DDTHH:mm") in the workshop timezone. */
export function toDateTimeLocal(iso: string, timeZone = workshopTimezone()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const wall = wallClockIn(date, timeZone);

  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

/**
 * A datetime-local value typed in the workshop timezone to an ISO 8601 UTC
 * string. Unparseable input is returned unchanged so the API reports it.
 */
export function fromDateTimeLocal(value: string, timeZone = workshopTimezone()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) {
    return value.trim();
  }

  const [, year, month, day, hour, minute, second] = match.map((part) => Number(part ?? 0));
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // Two passes settle the offset around daylight-saving transitions.
  let instant = wallAsUtc - offsetAt(new Date(wallAsUtc), timeZone);
  instant = wallAsUtc - offsetAt(new Date(instant), timeZone);

  return new Date(instant).toISOString().replace(".000Z", "Z");
}

function formatter(options: Intl.DateTimeFormatOptions, timeZone = workshopTimezone()) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, ...options });
}

export function formatDate(iso: string): string {
  return formatter({ weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return formatter({ hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "Tue, 10 Nov 2026, 9:00 am – 11:00 am", or both dates when the range spans days. */
export function formatSchedule(startsAt: string, endsAt: string): string {
  if (formatDate(startsAt) === formatDate(endsAt)) {
    return `${formatDate(startsAt)}, ${formatTime(startsAt)} – ${formatTime(endsAt)}`;
  }

  return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
}
