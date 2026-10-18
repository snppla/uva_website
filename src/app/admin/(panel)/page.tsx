import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, gte, lt, sql } from "drizzle-orm";
import { db, events, images, members, posts, resources } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { addDays, clubDate, formatDay, formatEventWhen } from "@/lib/dates";

export const metadata: Metadata = { title: "Admin" };

export default async function Dashboard() {
  const admin = await requireAdmin();
  const today = clubDate(new Date());
  const soon = addDays(today, 45);
  const count = (table: typeof posts | typeof events | typeof images | typeof resources | typeof members) =>
    db.select({ n: sql<number>`count(*)::int` }).from(table).then((r) => r[0].n);

  const [postCount, eventCount, photoCount, resourceCount, memberCount, activeCount, upcoming, expiring] =
    await Promise.all([
      count(posts),
      count(events),
      count(images),
      count(resources),
      count(members),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(members)
        .where(gte(members.expiresOn, today))
        .then((r) => r[0].n),
      db.select().from(events).where(gte(events.startsAt, new Date())).orderBy(asc(events.startsAt)).limit(5),
      db
        .select()
        .from(members)
        .where(and(gte(members.expiresOn, today), lt(members.expiresOn, soon)))
        .orderBy(asc(members.expiresOn)),
    ]);

  const stats = [
    { label: "News posts", value: postCount, href: "/admin/posts" },
    { label: "Events", value: eventCount, href: "/admin/events" },
    { label: "Photos", value: photoCount, href: "/admin/gallery" },
    { label: "Documents", value: resourceCount, href: "/admin/resources" },
    { label: "Active members", value: `${activeCount} / ${memberCount}`, href: "/admin/members" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {admin.name}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/posts/new" className="btn-primary">New post</Link>
          <Link href="/admin/events/new" className="btn-secondary">New event</Link>
          <Link href="/admin/gallery" className="btn-secondary">Upload photos</Link>
          <Link href="/admin/members" className="btn-secondary">Renew a member</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-brand-300">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Upcoming events</h2>
          {upcoming.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {upcoming.map((e) => (
                <li key={e.id} className="py-2">
                  <Link href={`/admin/events/${e.id}`} className="font-medium text-brand-700 hover:underline">
                    {e.title}
                  </Link>
                  <p className="text-slate-500">{formatEventWhen(e)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No upcoming events.</p>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Memberships expiring in the next 45 days</h2>
          {expiring.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {expiring.map((m) => (
                <li key={m.id} className="flex justify-between py-2">
                  <Link href={`/admin/members/${m.id}`} className="font-medium text-brand-700 hover:underline">
                    {m.firstName} {m.lastName}
                  </Link>
                  <span className="text-slate-500">{formatDay(m.expiresOn!)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">None.</p>
          )}
        </section>
      </div>
    </div>
  );
}
