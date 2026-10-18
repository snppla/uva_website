import "server-only";
import path from "node:path";
import { rm } from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import { db, albums, events, images, posts, settings } from "@/db";
import { fromClubTime } from "./dates";
import { UPLOAD_DIR, saveImage } from "./storage";
import type { SeedAlbum, SeedContent, SeedPhoto } from "./seed-types";

// Writes for importing content in bulk. Used by `npm run db:seed` (local
// database) and by the /api/seed endpoints (`npm run seed:remote`).

/** Find an album by slug, or create it. Existing albums are left as they are. */
export async function upsertAlbum(album: SeedAlbum) {
  const [existing] = await db.select({ id: albums.id }).from(albums).where(eq(albums.slug, album.slug));
  if (existing) return { id: existing.id, created: false };
  const [row] = await db
    .insert(albums)
    .values({
      title: album.title,
      slug: album.slug,
      description: album.description,
      date: album.date,
      ...(album.createdAt && { createdAt: new Date(album.createdAt) }),
    })
    .returning({ id: albums.id });
  return { id: row.id, created: true };
}

/** Which of these photo refs have already been imported. */
export async function existingRefs(refs: string[]) {
  if (!refs.length) return [];
  const rows = await db.select({ ref: images.sourceRef }).from(images).where(inArray(images.sourceRef, refs));
  return rows.map((r) => r.ref!);
}

/** Store a photo (resized like any upload) unless its ref was already imported. */
export async function addPhoto(photo: SeedPhoto, file: File, albumId: number | null) {
  const [existing] = await db.select({ id: images.id }).from(images).where(eq(images.sourceRef, photo.ref));
  if (existing) return "exists" as const;
  const saved = await saveImage(file);
  await db.insert(images).values({
    albumId,
    sourceRef: photo.ref,
    caption: photo.caption,
    key: saved.key,
    width: saved.width,
    height: saved.height,
    ...(photo.takenAt && { createdAt: new Date(photo.takenAt) }),
  });
  return "added" as const;
}

async function imageByRef(ref: string | undefined) {
  if (!ref) return null;
  const [row] = await db.select({ id: images.id, key: images.key }).from(images).where(eq(images.sourceRef, ref));
  return row ?? null;
}

/** Page settings, banner photo, events and posts. Existing events/posts are skipped. */
export async function applyContent(content: SeedContent) {
  const setSetting = (key: string, value: string) =>
    db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });

  for (const [key, value] of Object.entries(content.settings)) await setSetting(key, value);
  const hero = await imageByRef(content.heroRef);
  if (hero) await setSetting("heroImage", hero.key);

  let eventsAdded = 0;
  for (const e of content.events) {
    const allDay = !e.time;
    const startsAt = fromClubTime(e.date, e.time ?? "00:00");
    const [exists] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.title, e.title), eq(events.startsAt, startsAt)));
    if (exists) continue;
    const endDate = e.endDate ?? e.date;
    const endsAt = allDay
      ? endDate !== e.date
        ? fromClubTime(endDate)
        : null
      : e.endTime || endDate !== e.date
        ? fromClubTime(endDate, e.endTime ?? e.time)
        : null;
    await db.insert(events).values({ title: e.title, startsAt, endsAt, allDay, location: e.location ?? "", description: e.description ?? "" });
    eventsAdded++;
  }

  let postsAdded = 0;
  for (const p of content.posts) {
    const [exists] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, p.slug));
    if (exists) continue;
    const cover = await imageByRef(p.coverRef);
    const publishedAt = new Date(`${p.date}T12:00:00Z`);
    await db.insert(posts).values({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      body: p.body,
      coverImageId: cover?.id ?? null,
      published: true,
      publishedAt,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    });
    postsAdded++;
  }
  return { eventsAdded, postsAdded, settings: Object.keys(content.settings).length };
}

/** Delete all posts, events, albums, photos and page settings. Admins and members are kept. */
export async function resetContent() {
  await db.delete(posts);
  await db.delete(events);
  await db.delete(images);
  await db.delete(albums);
  await db.delete(settings);
  await rm(path.join(UPLOAD_DIR, "images"), { recursive: true, force: true });
}
