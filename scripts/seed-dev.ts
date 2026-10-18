/**
 * Seeds a development database with club photos and content.
 *
 *   npm run db:seed
 *
 * Reads data/seed-photos/<source>/manifest.json (written by the Facebook export
 * step) and data/seed-content.json if present. Safe to re-run: albums, events
 * and posts that already exist are skipped. `npm run db:seed -- --reset` first
 * deletes all posts, events, albums, photos, settings and uploaded images.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, albums, events, images, posts, settings } from "../src/db";
import { rm } from "node:fs/promises";
import { UPLOAD_DIR, saveImage } from "../src/lib/storage";
import { fromClubTime } from "../src/lib/dates";

const ROOT = path.resolve("data");
const PHOTOS = path.join(ROOT, "seed-photos");

// Albums used for other purposes rather than shown in the gallery.
const NOT_GALLERY = /^(cover photos|logo|profile pictures)$/i;

type ManifestPhoto = { fbid: string; file: string; caption: string; date: string | null };
type ManifestAlbum = { title: string; slug: string; photos: ManifestPhoto[]; date?: string; description?: string; dir?: string };
type Manifest = { source: string; albums: ManifestAlbum[] };
type Content = {
  /** Name a day's photo group: { "2025-06-07": "Open House 2025" } */
  albumNames?: Record<string, string>;
  /** Photos (by Facebook id) to leave out: screenshots, personal info, not club-related… */
  exclude?: string[];
  /** Hand-picked albums: photos (by Facebook id) pulled out of the timeline/group photos. */
  albums?: { title: string; fbids: string[]; date?: string; description?: string }[];
  /** Caption overrides by Facebook id. */
  captions?: Record<string, string>;
  /** Photo sources (folder names) whose Facebook captions are dropped, e.g. members' post text. */
  clearCaptionsFor?: string[];
  settings?: Record<string, string>;
  heroImage?: { album: string; fbid: string };
  events?: { title: string; date: string; time?: string; endDate?: string; endTime?: string; location?: string; description?: string }[];
  posts?: { title: string; slug: string; date: string; excerpt?: string; body: string; cover?: { album: string; fbid: string } }[];
};

function guard() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production" || !/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    if (!process.argv.includes("--force")) {
      console.error("Refusing to seed a non-local database. Pass --force if you really mean it.");
      process.exit(1);
    }
  }
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * An album's date: a full date in its title wins ("Freeze Fly Dec 31, 2016").
 * Otherwise the earliest posted date, but only if it agrees with any year or
 * month in the title; a contradiction leaves it blank rather than wrong.
 */
function dateForAlbum(title: string, posted: Date | null): string | null {
  const full = title.match(/\b([A-Z][a-z]{2,8})\.? (\d{1,2}), (\d{4})\b/);
  if (full) {
    const m = MONTHS.indexOf(full[1].slice(0, 3).toLowerCase());
    if (m >= 0) return `${full[3]}-${String(m + 1).padStart(2, "0")}-${full[2].padStart(2, "0")}`;
  }
  if (!posted) return null;
  const local = new Date(posted.toLocaleString("en-US", { timeZone: "America/Denver" }));
  const year = title.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year && Number(year) !== local.getFullYear()) return null;
  const monthWord = title.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/)?.[1];
  if (monthWord && MONTHS.indexOf(monthWord) !== local.getMonth()) return null;
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function parseDate(text: string | null) {
  if (!text) return null;
  const d = new Date(/\d{4}/.test(text) ? text : `${text}, ${new Date().getFullYear()}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

// Facebook photo id -> stored image key, so content can reference photos.
const imageKeys = new Map<string, string>();
const createdThisRun = new Set<number>();

async function storePhoto(file: string, albumId: number | null, caption: string, takenAt: Date | null) {
  const buffer = readFileSync(file);
  const saved = await saveImage(new File([buffer], path.basename(file), { type: "image/jpeg" }));
  const [row] = await db
    .insert(images)
    .values({ albumId, caption, key: saved.key, width: saved.width, height: saved.height, ...(takenAt && { createdAt: takenAt }) })
    .returning();
  return row;
}

/**
 * Photos posted outside any album are grouped by the day they were posted
 * (usually one event). Days with only a few photos are merged into one album
 * per year. data/seed-content.json can name groups or regroup photos.
 */
const MIN_DAY_ALBUM = 4;
const albumNames: Record<string, string> = {};
const albumPicks: NonNullable<Content["albums"]> = [];
const captionOverrides: Record<string, string> = {};
const clearCaptionsFor = new Set<string>();
const excluded = new Set<string>();

function splitTimeline(list: ManifestAlbum[]) {
  const out: ManifestAlbum[] = [];
  const claimed = new Set(albumPicks.flatMap((a) => a.fbids));
  for (const album of list) {
    if (!/^(Timeline photos|Group photos)$/.test(album.title)) {
      out.push(album);
      continue;
    }
    // Explicit albums from seed-content.json first.
    for (const pick of albumPicks) {
      const photos = album.photos.filter((p) => pick.fbids.includes(p.fbid));
      if (photos.length) out.push({ ...pick, slug: slugify(pick.title), photos, dir: album.slug });
    }
    const byDay = new Map<string, ManifestPhoto[]>();
    for (const p of album.photos) {
      if (claimed.has(p.fbid)) continue;
      const d = parseDate(p.date);
      const day = d ? d.toISOString().slice(0, 10) : "undated";
      byDay.set(day, [...(byDay.get(day) ?? []), p]);
    }
    const leftovers: ManifestPhoto[] = [];
    for (const [day, photos] of byDay) {
      if (day !== "undated" && photos.length >= MIN_DAY_ALBUM) {
        const label = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
        const title = albumNames[day] ?? `Club photos – ${label}`;
        out.push({ title, slug: slugify(title), photos, dir: album.slug, date: day });
      } else {
        leftovers.push(...photos);
      }
    }
    // A single catch-all album; merge across sources (public timeline + group).
    const more = out.find((a) => a.title === "More club photos" && a.dir === album.slug);
    if (more) more.photos.push(...leftovers);
    else if (leftovers.length) out.push({ title: "More club photos", slug: "more-club-photos", photos: leftovers, dir: album.slug });
  }
  return out;
}

async function seedPhotos() {
  if (!existsSync(PHOTOS)) return console.log("No data/seed-photos folder; skipping photos.");
  for (const source of readdirSync(PHOTOS)) {
    const manifestFile = path.join(PHOTOS, source, "manifest.json");
    if (!existsSync(manifestFile)) continue;
    const manifest: Manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    // Posted dates read from Facebook's timestamp tooltips (fb-dates step).
    const datesFile = path.join(PHOTOS, source, "dates.json");
    const posted: Record<string, { posted: string | null }> = existsSync(datesFile) ? JSON.parse(readFileSync(datesFile, "utf8")) : {};
    for (const a of manifest.albums) {
      a.photos = a.photos.filter((p) => !excluded.has(p.fbid));
      for (const p of a.photos) {
        if (posted[p.fbid]?.posted) p.date = posted[p.fbid].posted;
        if (clearCaptionsFor.has(source)) p.caption = "";
        if (captionOverrides[p.fbid] !== undefined) p.caption = captionOverrides[p.fbid];
      }
    }
    for (const album of splitTimeline(manifest.albums)) {
      if (!album.photos.length) continue;
      const dir = path.join(PHOTOS, source, album.dir ?? album.slug);
      const gallery = !NOT_GALLERY.test(album.title);
      const dates = album.photos.map((p) => parseDate(p.date)).filter((d): d is Date => !!d);
      const latest = dates.length ? new Date(Math.max(...dates.map(Number))) : null;
      const earliest = dates.length ? new Date(Math.min(...dates.map(Number))) : null;
      const albumDate = album.date ?? dateForAlbum(album.title, earliest);

      let albumId: number | null = null;
      if (gallery) {
        const slug = slugify(album.title);
        const [existing] = await db.select().from(albums).where(eq(albums.slug, slug));
        if (existing && !createdThisRun.has(existing.id)) {
          console.log(`  album exists: ${album.title}`);
          continue;
        }
        if (existing) {
          albumId = existing.id; // e.g. "More club photos" filled from several sources
        } else {
          const [row] = await db
            .insert(albums)
            .values({ title: album.title.replace("Pictues", "Pictures"), slug, description: album.description ?? "", date: albumDate, ...(latest && { createdAt: latest }) })
            .returning();
          albumId = row.id;
          createdThisRun.add(row.id);
        }
      }

      for (const photo of album.photos) {
        if (imageKeys.has(photo.fbid)) continue; // already imported from another album
        const takenAt = parseDate(photo.date) ?? (albumDate ? new Date(`${albumDate}T12:00:00Z`) : latest);
        const img = await storePhoto(path.join(dir, photo.file), albumId, photo.caption, takenAt);
        imageKeys.set(`${album.title}/${photo.fbid}`, img.key);
        imageKeys.set(photo.fbid, img.key);
      }
      console.log(`  ${gallery ? "album" : "photos"}: ${album.title} (${album.photos.length})`);
    }
  }
}

async function seedContent() {
  const file = path.join(ROOT, "seed-content.json");
  if (!existsSync(file)) return console.log("No data/seed-content.json; skipping content.");
  const content: Content = JSON.parse(readFileSync(file, "utf8"));

  const setSetting = (key: string, value: string) =>
    db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });

  for (const [key, value] of Object.entries(content.settings ?? {})) await setSetting(key, value);
  if (content.heroImage) {
    const key = imageKeys.get(content.heroImage.fbid);
    if (key) await setSetting("heroImage", key);
  }

  for (const e of content.events ?? []) {
    const allDay = !e.time;
    const startsAt = fromClubTime(e.date, e.time ?? "00:00");
    const [exists] = await db.select({ id: events.id }).from(events).where(and(eq(events.title, e.title), eq(events.startsAt, startsAt)));
    if (exists) continue;
    const endDate = e.endDate ?? e.date;
    const endsAt = allDay
      ? endDate !== e.date ? fromClubTime(endDate) : null
      : e.endTime || endDate !== e.date ? fromClubTime(endDate, e.endTime ?? e.time) : null;
    await db.insert(events).values({ title: e.title, startsAt, endsAt, allDay, location: e.location ?? "", description: e.description ?? "" });
  }

  for (const p of content.posts ?? []) {
    const [exists] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, p.slug));
    if (exists) continue;
    let coverImageId: number | null = null;
    const coverKey = p.cover && imageKeys.get(p.cover.fbid);
    if (coverKey) [{ id: coverImageId }] = await db.select({ id: images.id }).from(images).where(eq(images.key, coverKey));
    const publishedAt = new Date(`${p.date}T12:00:00Z`);
    await db.insert(posts).values({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      body: p.body,
      coverImageId,
      published: true,
      publishedAt,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    });
  }
  console.log(`  content: ${content.events?.length ?? 0} events, ${content.posts?.length ?? 0} posts, ${Object.keys(content.settings ?? {}).length} settings`);
}

async function reset() {
  console.log("Resetting content…");
  await db.delete(posts);
  await db.delete(events);
  await db.delete(images);
  await db.delete(albums);
  await db.delete(settings);
  await rm(path.join(UPLOAD_DIR, "images"), { recursive: true, force: true });
}

async function main() {
  guard();
  if (process.argv.includes("--reset")) await reset();
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });
  const contentFile = path.join(ROOT, "seed-content.json");
  if (existsSync(contentFile)) {
    const content: Content = JSON.parse(readFileSync(contentFile, "utf8"));
    Object.assign(albumNames, content.albumNames ?? {});
    albumPicks.push(...(content.albums ?? []));
    for (const id of content.exclude ?? []) excluded.add(id);
    Object.assign(captionOverrides, content.captions ?? {});
    for (const s of content.clearCaptionsFor ?? []) clearCaptionsFor.add(s);
  }
  console.log("Seeding photos…");
  await seedPhotos();
  console.log("Seeding content…");
  await seedContent();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(images);
  console.log(`Done. ${n} images in the database.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
