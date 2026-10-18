import Link from "next/link";
import { getResources } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { formatSize, groupBy } from "@/lib/format";
import { AdminTitle } from "@/components/admin/fields";
import { Empty } from "@/components/ui";
import { ResourceForm } from "./resource-form";

export default async function ResourcesAdmin() {
  await requireAdmin();
  const rows = await getResources();
  const groups = groupBy(rows, (r) => r.category);
  return (
    <>
      <AdminTitle title="Resources & documents" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {rows.length ? (
            [...groups].map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-2 font-semibold text-slate-700">{category}</h2>
                <ul className="card divide-y divide-slate-100">
                  {items.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <Link href={`/admin/resources/${r.id}`} className="font-medium text-brand-700 hover:underline">
                          {r.title}
                        </Link>
                        <p className="truncate text-slate-500">
                          {r.originalName} · {formatSize(r.size)}
                        </p>
                      </div>
                      <a href={`/resources/${r.id}/download`} className="shrink-0 text-xs text-slate-500 hover:text-brand-700">
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <Empty>No documents yet.</Empty>
          )}
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Upload a document</h2>
          <ResourceForm categories={[...groups.keys()]} />
        </div>
      </div>
    </>
  );
}
