import { site } from "@/site.config";

// Helpers for working in the club's time zone regardless of the server's.
const tz = site.timeZone;

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function offsetMs(date: Date) {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a wall-clock date ("2026-10-18") + time ("14:30") in the club's zone to a Date. */
export function fromClubTime(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetMs(new Date(guess));
  // Re-check the offset at the result in case we crossed a DST change.
  return new Date(guess - offsetMs(new Date(first)));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for the given instant in the club's zone. */
export function clubDate(date: Date) {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "HH:MM" for the given instant in the club's zone. */
export function clubTime(date: Date) {
  const p = zonedParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts });

export const formatDate = (d: Date) =>
  fmt({ weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
export const formatLongDate = (d: Date) =>
  fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(d);
export const formatShortDate = (d: Date) =>
  fmt({ month: "short", day: "numeric", year: "numeric" }).format(d);
export const formatTime = (d: Date) =>
  fmt({ hour: "numeric", minute: "2-digit" }).format(d);

/** Human description of when an event happens. */
export function formatEventWhen(e: { startsAt: Date; endsAt: Date | null; allDay: boolean }) {
  const sameDay = !e.endsAt || clubDate(e.startsAt) === clubDate(e.endsAt);
  if (e.allDay) {
    return sameDay
      ? formatLongDate(e.startsAt)
      : `${formatDate(e.startsAt)} – ${formatDate(e.endsAt!)}`;
  }
  if (!e.endsAt) return `${formatLongDate(e.startsAt)}, ${formatTime(e.startsAt)}`;
  if (sameDay) {
    return `${formatLongDate(e.startsAt)}, ${formatTime(e.startsAt)} – ${formatTime(e.endsAt)}`;
  }
  return `${formatDate(e.startsAt)} ${formatTime(e.startsAt)} – ${formatDate(e.endsAt)} ${formatTime(e.endsAt)}`;
}

/** Add whole days to a "YYYY-MM-DD" string. */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Format a plain "YYYY-MM-DD" date (no time zone involved). */
export function formatDay(ymd: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${ymd}T00:00:00Z`),
  );
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}
