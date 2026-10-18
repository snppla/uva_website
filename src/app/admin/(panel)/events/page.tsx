import Link from "next/link";
import { asc, desc, gte, lt } from "drizzle-orm";
import { db, events, type Event } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { daysAgo, formatEventWhen } from "@/lib/dates";
import { AdminTitle } from "@/components/admin/fields";
import { Empty } from "@/components/ui";

export default async function EventsAdmin() {
  await requireAdmin();
  const cutoff = daysAgo(1);
  const [upcoming, past] = await Promise.all([
    db.select().from(events).where(gte(events.startsAt, cutoff)).orderBy(asc(events.startsAt)),
    db.select().from(events).where(lt(events.startsAt, cutoff)).orderBy(desc(events.startsAt)).limit(30),
  ]);
  return (
    <>
      <AdminTitle title="Events">
        <Link href="/admin/events/new" className="btn-primary">New event</Link>
      </AdminTitle>
      <h2 className="mb-2 font-semibold text-slate-700">Upcoming</h2>
      <EventTable rows={upcoming} empty="No upcoming events." />
      <h2 className="mt-8 mb-2 font-semibold text-slate-700">Past</h2>
      <EventTable rows={past} empty="No past events." />
    </>
  );
}

function EventTable({ rows, empty }: { rows: Event[]; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="card divide-y divide-slate-100">
      {rows.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <div>
            <Link href={`/admin/events/${e.id}`} className="font-medium text-brand-700 hover:underline">
              {e.title}
            </Link>
            <p className="text-slate-500">{formatEventWhen(e)}</p>
          </div>
          <Link href={`/admin/events/new?copy=${e.id}`} className="text-xs text-slate-500 hover:text-brand-700">
            Duplicate
          </Link>
        </li>
      ))}
    </ul>
  );
}
