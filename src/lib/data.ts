import "server-only";
import { connection } from "next/server";
import { and, asc, desc, eq, gte, isNotNull, lt, or, sql } from "drizzle-orm";
import {
  db,
  albums,
  events,
  images,
  membershipPlans,
  posts,
  resources,
  settings,
} from "@/db";
import { SETTINGS, type SettingKey, type Settings } from "./settings";

// Read queries for public pages. Each one calls connection() first so the
// query runs per request rather than during the build (no DB at build time).

export async function getSettings(): Promise<Settings> {
  await connection();
  const rows = await db.select().from(settings);
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    (Object.keys(SETTINGS) as SettingKey[]).map((k) => [k, saved[k] ?? SETTINGS[k].default]),
  ) as Settings;
}

const postWithCover = {
  id: posts.id,
  title: posts.title,
  slug: posts.slug,
  excerpt: posts.excerpt,
  publishedAt: posts.publishedAt,
  coverKey: images.key,
};

export async function getPublishedPosts(limit = 50, offset = 0) {
  await connection();
  return db
    .select(postWithCover)
    .from(posts)
    .leftJoin(images, eq(posts.coverImageId, images.id))
    .where(eq(posts.published, true))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function countPublishedPosts() {
  await connection();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(posts)
    .where(eq(posts.published, true));
  return row.n;
}

export async function getPostBySlug(slug: string) {
  await connection();
  const [row] = await db
    .select({ post: posts, coverKey: images.key })
    .from(posts)
    .leftJoin(images, eq(posts.coverImageId, images.id))
    .where(and(eq(posts.slug, slug), eq(posts.published, true)));
  return row ?? null;
}

export async function getUpcomingEvents(limit = 5) {
  await connection();
  const now = new Date();
  return db
    .select()
    .from(events)
    .where(
      or(
        gte(events.startsAt, now),
        and(isNotNull(events.endsAt), gte(events.endsAt, now)),
        // All-day events stay "upcoming" for the whole day.
        and(eq(events.allDay, true), gte(events.startsAt, new Date(now.getTime() - 86_400_000))),
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(limit);
}

/** Events overlapping [from, to). */
export async function getEventsBetween(from: Date, to: Date) {
  await connection();
  return db
    .select()
    .from(events)
    .where(
      and(
        lt(events.startsAt, to),
        or(gte(events.startsAt, from), and(isNotNull(events.endsAt), gte(events.endsAt, from))),
      ),
    )
    .orderBy(asc(events.startsAt));
}

export async function getEvent(id: number) {
  await connection();
  const [row] = await db.select().from(events).where(eq(events.id, id));
  return row ?? null;
}

export async function getAllEventsForFeed() {
  await connection();
  const since = new Date(Date.now() - 365 * 86_400_000);
  return db.select().from(events).where(gte(events.startsAt, since)).orderBy(asc(events.startsAt));
}

export async function getAlbums() {
  await connection();
  return db
    .select({
      id: albums.id,
      title: albums.title,
      slug: albums.slug,
      description: albums.description,
      date: albums.date,
      createdAt: albums.createdAt,
      // The first photo uploaded is the album cover.
      coverKey: sql<string | null>`(array_agg(${images.key} order by ${images.createdAt}, ${images.id}))[1]`,
      photoCount: sql<number>`count(${images.id})::int`,
    })
    .from(albums)
    .leftJoin(images, eq(images.albumId, albums.id))
    .groupBy(albums.id)
    // Dated albums newest first, then undated ones (general collections).
    .orderBy(sql`${albums.date} desc nulls last`, desc(albums.createdAt), desc(albums.id));
}

export async function getAlbumBySlug(slug: string) {
  await connection();
  const [album] = await db.select().from(albums).where(eq(albums.slug, slug));
  if (!album) return null;
  const photos = await db
    .select()
    .from(images)
    .where(eq(images.albumId, album.id))
    .orderBy(asc(images.createdAt));
  return { album, photos };
}

export async function getRecentPhotos(limit = 8) {
  await connection();
  return db
    .select({ id: images.id, key: images.key, caption: images.caption, albumSlug: albums.slug })
    .from(images)
    .innerJoin(albums, eq(images.albumId, albums.id))
    // Photos from the most recent dated albums first.
    .orderBy(sql`${albums.date} desc nulls last`, desc(images.createdAt))
    .limit(limit);
}

export async function getResources() {
  await connection();
  return db
    .select()
    .from(resources)
    .orderBy(asc(resources.category), asc(resources.sortOrder), asc(resources.title));
}

export async function getResource(id: number) {
  await connection();
  const [row] = await db.select().from(resources).where(eq(resources.id, id));
  return row ?? null;
}

export async function getMembershipPlans() {
  await connection();
  return db.select().from(membershipPlans).orderBy(asc(membershipPlans.sortOrder), asc(membershipPlans.id));
}
