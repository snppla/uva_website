import type { Metadata } from "next";
import { Suspense } from "react";
import { getResources } from "@/lib/data";
import { formatSize, groupBy } from "@/lib/format";
import { Container, Empty, Loading, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Resources",
  description: "Club documents and downloads from Utah Valley Aeromodelers, the RC flying club in Saratoga Springs, Utah.",
};

export default function ResourcesPage() {
  return (
    <>
      <PageHeader title="Resources" subtitle="Club bylaws, field rules, forms and other documents." />
      <Container className="max-w-4xl">
        <Suspense fallback={<Loading />}>
          <ResourceList />
        </Suspense>
      </Container>
    </>
  );
}

async function ResourceList() {
  const resources = await getResources();
  if (!resources.length) return <Empty>No documents have been posted yet.</Empty>;

  const groups = groupBy(resources, (r) => r.category);
  return (
    <div className="space-y-10">
      {[...groups].map(([category, items]) => (
        <section key={category}>
          <h2 className="heading mb-3 text-2xl text-brand-950">{category}</h2>
          <ul className="card divide-y divide-slate-100">
            {items.map((r) => (
              <li key={r.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold uppercase text-brand-800">
                  {r.originalName.split(".").pop()?.slice(0, 4)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{r.title}</p>
                  {r.description && <p className="text-sm text-slate-600">{r.description}</p>}
                </div>
                <a href={`/resources/${r.id}/download`} className="btn-secondary shrink-0">
                  Download <span className="hidden text-xs text-slate-500 sm:inline">({formatSize(r.size)})</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
