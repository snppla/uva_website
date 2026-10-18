import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, posts } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatShortDate } from "@/lib/dates";
import { AdminTitle } from "@/components/admin/fields";
import { Empty } from "@/components/ui";

export default async function PostsAdmin() {
  await requireAdmin();
  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
  return (
    <>
      <AdminTitle title="News posts">
        <Link href="/admin/posts/new" className="btn-primary">New post</Link>
      </AdminTitle>
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/posts/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.published ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Published</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatShortDate(p.publishedAt ?? p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No posts yet.</Empty>
      )}
    </>
  );
}
