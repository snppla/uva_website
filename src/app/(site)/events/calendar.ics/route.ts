import { getAllEventsForFeed } from "@/lib/data";
import { addDays, clubDate } from "@/lib/dates";
import { site } from "@/site.config";

// iCalendar feed so members can subscribe from Google Calendar, Apple Calendar, Outlook...
export async function GET(request: Request) {
  const events = await getAllEventsForFeed();
  const host = new URL(request.url).host;

  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
  const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateOnly = (ymd: string) => ymd.replace(/-/g, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//Events//EN`,
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(site.name)}`,
    `X-WR-TIMEZONE:${site.timeZone}`,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:event-${e.id}@${host}`, `DTSTAMP:${utc(e.createdAt)}`);
    if (e.allDay) {
      const last = clubDate(e.endsAt ?? e.startsAt);
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(clubDate(e.startsAt))}`, `DTEND;VALUE=DATE:${dateOnly(addDays(last, 1))}`);
    } else {
      lines.push(`DTSTART:${utc(e.startsAt)}`);
      lines.push(`DTEND:${utc(e.endsAt ?? new Date(e.startsAt.getTime() + 3_600_000))}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push(`URL:https://${host}/events/${e.id}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  // Fold long lines at 75 octets as the spec requires (approximated by characters).
  const folded = lines.map((l) => l.match(/.{1,74}/g)!.join("\r\n ")).join("\r\n");
  return new Response(folded + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="club-events.ics"',
    },
  });
}
