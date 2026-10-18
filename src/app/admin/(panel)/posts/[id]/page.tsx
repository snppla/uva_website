import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, images, posts } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { ConfirmButton } from "@/components/admin/forms";
import { PostForm } from "../post-form";
import { deletePost } from "../actions";

export default async function EditPost({ params }: PageProps<"/admin/posts/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const [row] = Number.isInteger(id)
    ? await db
        .select({ post: posts, coverKey: images.key })
        .from(posts)
        .leftJoin(images, eq(posts.coverImageId, images.id))
        .where(eq(posts.id, id))
    : [];
  if (!row) notFound();
  return (
    <>
      <AdminTitle title="Edit post">
        {row.post.published && (
          <Link href={`/blog/${row.post.slug}`} className="btn-secondary" target="_blank">
            View
          </Link>
        )}
        <ConfirmButton action={deletePost} fields={{ id }} confirm="Delete this post permanently?">
          Delete
        </ConfirmButton>
      </AdminTitle>
      <PostForm post={row.post} coverKey={row.coverKey} />
    </>
  );
}
