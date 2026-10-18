import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, members } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { addDays, clubDate, formatDay } from "@/lib/dates";
import { AdminTitle } from "@/components/admin/fields";
import { Empty } from "@/components/ui";
import { renewMember } from "./actions";
import { EXPIRING_DAYS, FILTERS, memberWhere, parseFilter } from "./filters";

export default async function MembersAdmin({ searchParams }: PageProps<"/admin/members">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = parseFilter(sp.filter);
  const today = clubDate(new Date());

  const rows = await db
    .select()
    .from(members)
    .where(memberWhere(q, filter, today))
    .orderBy(asc(members.lastName), asc(members.firstName));

  const exportQuery = new URLSearchParams({ q, filter }).toString();

  return (
    <>
      <AdminTitle title="Members">
        <Link href="/admin/members/import" className="btn-secondary">Import CSV</Link>
        <a href={`/admin/members/export?${exportQuery}`} className="btn-secondary">Export CSV</a>
        <Link href="/admin/members/new" className="btn-primary">Add member</Link>
      </AdminTitle>

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email or AMA #" className="input max-w-xs" />
        <select name="filter" defaultValue={filter} className="input w-auto">
          {Object.entries(FILTERS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn-secondary">Filter</button>
      </form>

      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">AMA #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => {
                const expired = !m.expiresOn || m.expiresOn < today;
                const expiring = !expired && m.expiresOn! < addDays(today, EXPIRING_DAYS);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/members/${m.id}`} className="font-medium text-brand-700 hover:underline">
                        {m.lastName}, {m.firstName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{m.email}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.amaNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.membershipType}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          expired ? "bg-red-100 text-red-800" : expiring ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {m.expiresOn ? formatDay(m.expiresOn) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={renewMember}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="text-xs font-semibold text-brand-700 hover:underline" title="Extend membership by one year">
                          Renew +1 yr
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{q || filter !== "all" ? "No members match." : "No members yet. Add them one at a time or import a spreadsheet."}</Empty>
      )}
      <p className="mt-3 text-sm text-slate-500">{rows.length} member{rows.length === 1 ? "" : "s"}</p>
    </>
  );
}
