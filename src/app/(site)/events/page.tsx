import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getEventsBetween } from "@/lib/data";
import { addDays, clubDate, formatTime, fromClubTime } from "@/lib/dates";
import { EventItem } from "@/components/cards";
import { Container, Empty, Loading, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <>
      <PageHeader title="Events calendar" subtitle="Fun flies, meetings, work days and more.">
        <p className="mt-4 text-sm text-brand-100">
          Add these events to your phone or computer calendar:{" "}
          <Link href="/events/calendar.ics" className="font-semibold text-white underline">
            subscribe to the club calendar
          </Link>
        </p>
      </PageHeader>
      <Container>
        <Suspense fallback={<Loading />}>
          <Calendar searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

async function Calendar({ searchParams }: Pick<PageProps<"/events">, "searchParams">) {
  const { month } = await searchParams;
  await connection();
  const today = clubDate(new Date());
  const ym = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);

  const first = `${ym}-01`;
  const lastOfMonth = addDays(`${shiftMonth(ym, 1)}-01`, -1);
  const gridStart = addDays(first, -new Date(`${first}T00:00:00Z`).getUTCDay());
  const gridEnd = addDays(lastOfMonth, 6 - new Date(`${lastOfMonth}T00:00:00Z`).getUTCDay());

  const events = await getEventsBetween(fromClubTime(gridStart), fromClubTime(addDays(gridEnd, 1)));

  // Place each event on every day it spans.
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const startDay = clubDate(e.startsAt);
    const endDay = e.endsAt ? clubDate(e.endsAt) : startDay;
    for (let d = startDay; d <= endDay; d = addDays(d, 1)) {
      byDay.set(d, [...(byDay.get(d) ?? []), e]);
    }
  }

  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const monthLabel = new Date(`${first}T12:00:00Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const monthEvents = events.filter((e) => clubDate(e.endsAt ?? e.startsAt) >= first && clubDate(e.startsAt) <= lastOfMonth);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/events?month=${shiftMonth(ym, -1)}`} className="btn-secondary" aria-label="Previous month">
          ←
        </Link>
        <div className="text-center">
          <h2 className="heading text-2xl text-brand-950">{monthLabel}</h2>
          {ym !== today.slice(0, 7) && (
            <Link href="/events" className="text-sm text-brand-700 hover:underline">
              Back to today
            </Link>
          )}
        </div>
        <Link href={`/events?month=${shiftMonth(ym, 1)}`} className="btn-secondary" aria-label="Next month">
          →
        </Link>
      </div>

      {/* Month grid on larger screens */}
      <div className="card hidden overflow-hidden md:block">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center text-xs font-semibold uppercase text-slate-600">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const inMonth = d.startsWith(ym);
            return (
              <div
                key={d}
                className={`min-h-28 border-r border-b border-slate-100 p-1.5 text-sm ${inMonth ? "" : "bg-slate-50 text-slate-400"}`}
              >
                <div
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    d === today ? "bg-accent-500 text-white" : ""
                  }`}
                >
                  {Number(d.slice(8))}
                </div>
                <div className="space-y-1">
                  {(byDay.get(d) ?? []).map((e) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="block truncate rounded border-l-2 border-accent-500 bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-900 hover:bg-brand-100"
                      title={e.title}
                    >
                      {!e.allDay && clubDate(e.startsAt) === d && (
                        <span className="text-brand-700">{formatTime(e.startsAt)} </span>
                      )}
                      {e.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* List on phones */}
      <div className="space-y-3 md:hidden">
        {monthEvents.length ? (
          monthEvents.map((e) => <EventItem key={e.id} event={e} />)
        ) : (
          <Empty>No events this month.</Empty>
        )}
      </div>
    </>
  );
}
