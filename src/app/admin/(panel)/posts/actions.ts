"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, images, posts } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
  bool,
  contentChanged,
  errorMessage,
  fileField,
  int,
  removeImage,
  storeImage,
  str,
  uniqueSlug,
  type FormState,
} from "@/lib/admin";

export async function savePost(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title");
  if (!title) return { error: "Title is required." };

  const [existing] = id ? await db.select().from(posts).where(eq(posts.id, id)) : [];
  if (id && !existing) return { error: "Post not found." };

  let coverImageId = existing?.coverImageId ?? null;
  const oldCover = coverImageId;
  try {
    const cover = fileField(fd, "cover");
    if (cover) coverImageId = (await storeImage(cover)).id;
    else if (bool(fd, "removeCover")) coverImageId = null;
  } catch (e) {
    return { error: errorMessage(e) };
  }

  const published = bool(fd, "published");
  const values = {
    title,
    slug: await uniqueSlug(posts, str(fd, "slug") || title, id || undefined),
    excerpt: str(fd, "excerpt"),
    body: str(fd, "body"),
    coverImageId,
    published,
    publishedAt: published ? (existing?.publishedAt ?? new Date()) : null,
    updatedAt: new Date(),
  };

  if (existing) await db.update(posts).set(values).where(eq(posts.id, id));
  else await db.insert(posts).values(values);

  if (oldCover && oldCover !== coverImageId) await removeOrphanImage(oldCover);
  contentChanged();
  redirect("/admin/posts");
}

export async function deletePost(fd: FormData) {
  await requireAdmin();
  const [row] = await db.delete(posts).where(eq(posts.id, int(fd, "id"))).returning();
  if (row?.coverImageId) await removeOrphanImage(row.coverImageId);
  contentChanged();
  redirect("/admin/posts");
}

// Cover images uploaded here aren't in an album; clean them up when replaced.
async function removeOrphanImage(imageId: number) {
  const [img] = await db.select().from(images).where(eq(images.id, imageId));
  if (img && img.albumId === null) await removeImage(img.id);
}
