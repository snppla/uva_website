import "server-only";
import { revalidatePath } from "next/cache";
import { and, eq, ne, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db, images } from "@/db";
import { deleteImageFiles, saveImage } from "./storage";

/** Result returned by admin form actions and shown by <ActionForm>. */
export type FormState = { error?: string; message?: string } | undefined;

export const str = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
export const int = (fd: FormData, name: string) => Number.parseInt(str(fd, name), 10) || 0;
export const bool = (fd: FormData, name: string) => fd.get(name) === "on";

/** A non-empty uploaded file from the form, or null. */
export function fileField(fd: FormData, name: string): File | null {
  const f = fd.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

/** Make `base` unique within table.slug, ignoring the row being edited. */
export async function uniqueSlug(
  table: PgTable & { slug: PgColumn; id: PgColumn },
  base: string,
  excludeId?: number,
) {
  const slug = slugify(base);
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? slug : `${slug}-${n}`;
    const conds: SQL[] = [eq(table.slug, candidate)];
    if (excludeId) conds.push(ne(table.id, excludeId));
    const hit = await db.select({ id: table.id }).from(table).where(and(...conds)).limit(1);
    if (!hit.length) return candidate;
  }
}

/** Refresh every page after content changes. */
export function contentChanged() {
  revalidatePath("/", "layout");
}

/** Save an uploaded photo and record it (optionally in an album). */
export async function storeImage(file: File, albumId: number | null = null, caption = "") {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  const saved = await saveImage(file);
  const [row] = await db
    .insert(images)
    .values({ albumId, caption, key: saved.key, width: saved.width, height: saved.height })
    .returning();
  return row;
}

export async function removeImage(id: number) {
  const [row] = await db.delete(images).where(eq(images.id, id)).returning();
  if (row) await deleteImageFiles(row.key);
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}
