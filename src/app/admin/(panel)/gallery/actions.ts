"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, albums, images } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
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

const albumDate = (fd: FormData) => (/^\d{4}-\d{2}-\d{2}$/.test(str(fd, "date")) ? str(fd, "date") : null);

export async function createAlbum(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const title = str(fd, "title");
  if (!title) return { error: "Album title is required." };
  const [album] = await db
    .insert(albums)
    .values({ title, slug: await uniqueSlug(albums, title), description: str(fd, "description"), date: albumDate(fd) })
    .returning();
  redirect(`/admin/gallery/${album.id}`);
}

export async function updateAlbum(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title");
  if (!title) return { error: "Album title is required." };
  await db.update(albums).set({ title, description: str(fd, "description"), date: albumDate(fd) }).where(eq(albums.id, id));
  contentChanged();
  return { message: "Album saved." };
}

export async function deleteAlbum(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const photos = await db.select({ id: images.id }).from(images).where(eq(images.albumId, id));
  for (const p of photos) await removeImage(p.id);
  await db.delete(albums).where(eq(albums.id, id));
  contentChanged();
  redirect("/admin/gallery");
}

/** Upload a single photo; the client calls this once per selected file. */
export async function uploadPhoto(fd: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const file = fileField(fd, "photo");
  if (!file) return { error: "No file." };
  try {
    await storeImage(file, int(fd, "albumId"));
    return {};
  } catch (e) {
    return { error: `${file.name}: ${errorMessage(e)}` };
  }
}

export async function photosUploaded() {
  await requireAdmin();
  contentChanged();
}

export async function updateCaption(fd: FormData) {
  await requireAdmin();
  await db.update(images).set({ caption: str(fd, "caption") }).where(eq(images.id, int(fd, "id")));
  contentChanged();
}

export async function deletePhoto(fd: FormData) {
  await requireAdmin();
  await removeImage(int(fd, "id"));
  contentChanged();
}
