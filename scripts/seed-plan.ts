/**
 * Works out what to import from data/seed-photos/<source>/manifest.json (the
 * Facebook export) and data/seed-content.json. Pure: reads files, touches no
 * database. Used by seed-dev.ts (local) and seed-remote.ts (via the site's API).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { SeedAlbum, SeedContent, SeedPhoto } from "../src/lib/seed-types";

export type PlanPhoto = SeedPhoto & { file: string };
export type PlanAlbum = SeedAlbum & { gallery: boolean; photos: PlanPhoto[] };
export type Plan = { albums: PlanAlbum[]; content: SeedContent | null };

// Albums used for other purposes rather than shown in the gallery.
const NOT_GALLERY = /^(cover photos|logo|profile pictures)$/i;
// A year with fewer loose photos than this goes into "More club photos" instead.
const MIN_YEAR_ALBUM = 4;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

type ManifestPhoto = { fbid: string; file: string; caption: string; date: string | null };
// date: undefined = work it out from the title/photos; null = deliberately undated.
type ManifestAlbum = { title: string; slug: string; photos: ManifestPhoto[]; date?: string | null; description?: string; dir?: string };
type Manifest = { source: string; albums: ManifestAlbum[] };
type ContentFile = {
  /** Photos (by Facebook id) to leave out: screenshots, personal info, not club-related… */
  exclude?: string[];
  /** Hand-picked albums: photos (by Facebook id) pulled out of the timeline/group photos. */
  albums?: { title: string; fbids: string[]; date?: string; description?: string }[];
  /** Caption overrides by Facebook id. */
  captions?: Record<string, string>;
  /** Photo sources (folder names) whose Facebook captions are dropped, e.g. members' post text. */
  clearCaptionsFor?: string[];
  settings?: Record<string, string>;
  heroImage?: { fbid: string };
  events?: SeedContent["events"];
  posts?: (Omit<SeedContent["posts"][number], "coverRef"> & { cover?: { fbid: string } })[];
};

const ref = (fbid: string) => `fb:${fbid}`;
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function parseDate(text: string | null) {
  if (!text) return null;
  const d = new Date(/\d{4}/.test(text) ? text : `${text}, ${new Date().getFullYear()}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

/**
 * Split loose timeline/group photos into hand-picked albums (seed-content.json)
 * and, for the rest, one "Around the field <year>" album per year.
 */
function splitLoosePhotos(list: ManifestAlbum[], cfg: ContentFile) {
  const picks = cfg.albums ?? [];
  const claimed = new Set(picks.flatMap((a) => a.fbids));
  const out: ManifestAlbum[] = [];
  for (const album of list) {
    if (!/^(Timeline photos|Group photos)$/.test(album.title)) {
      out.push(album);
      continue;
    }
    for (const pick of picks) {
      const photos = album.photos.filter((p) => pick.fbids.includes(p.fbid));
      // Hand-picked albums without a date span years (e.g. "Builds & projects").
      if (photos.length) out.push({ ...pick, date: pick.date ?? null, slug: slugify(pick.title), photos, dir: album.slug });
    }
    const byYear = new Map<string, ManifestPhoto[]>();
    for (const p of album.photos) {
      if (claimed.has(p.fbid)) continue;
      const year = parseDate(p.date)?.getFullYear();
      const title = year ? `Around the field ${year}` : "More club photos";
      byYear.set(title, [...(byYear.get(title) ?? []), p]);
    }
    const more: ManifestPhoto[] = byYear.get("More club photos") ?? [];
    for (const [title, photos] of byYear) {
      if (title === "More club photos") continue;
      if (photos.length < MIN_YEAR_ALBUM) {
        more.push(...photos);
        continue;
      }
      // Date a year's album by its newest photo, so albums sort by recency.
      const newest = photos.map((p) => parseDate(p.date)).filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0];
      out.push({ title, slug: slugify(title), photos, dir: album.slug, date: newest?.toISOString().slice(0, 10) });
    }
    if (more.length) out.push({ title: "More club photos", slug: "more-club-photos", photos: more, dir: album.slug, date: null });
  }
  return out;
}

export function buildPlan(dataDir = path.resolve("data")): Plan {
  const photosDir = path.join(dataDir, "seed-photos");
  const contentFile = path.join(dataDir, "seed-content.json");
  const cfg: ContentFile = existsSync(contentFile) ? JSON.parse(readFileSync(contentFile, "utf8")) : {};
  const excluded = new Set(cfg.exclude ?? []);
  const clearCaptions = new Set(cfg.clearCaptionsFor ?? []);

  const bySlug = new Map<string, PlanAlbum>();
  const seen = new Set<string>(); // each photo once, even if it appears in two albums
  for (const source of existsSync(photosDir) ? readdirSync(photosDir) : []) {
    const manifestFile = path.join(photosDir, source, "manifest.json");
    if (!existsSync(manifestFile)) continue;
    const manifest: Manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    const datesFile = path.join(photosDir, source, "dates.json");
    const posted: Record<string, { posted: string | null }> = existsSync(datesFile) ? JSON.parse(readFileSync(datesFile, "utf8")) : {};
    for (const a of manifest.albums) {
      a.photos = a.photos.filter((p) => !excluded.has(p.fbid));
      for (const p of a.photos) {
        if (posted[p.fbid]?.posted) p.date = posted[p.fbid].posted;
        if (clearCaptions.has(source)) p.caption = "";
        if (cfg.captions?.[p.fbid] !== undefined) p.caption = cfg.captions[p.fbid];
      }
    }

    for (const album of splitLoosePhotos(manifest.albums, cfg)) {
      const dates = album.photos.map((p) => parseDate(p.date)).filter((d): d is Date => !!d);
      const latest = dates.length ? new Date(Math.max(...dates.map(Number))) : null;
      const earliest = dates.length ? new Date(Math.min(...dates.map(Number))) : null;
      const date = album.date !== undefined ? album.date : dateForAlbum(album.title, earliest);
      const slug = slugify(album.title);
      const planned: PlanAlbum = bySlug.get(slug) ?? {
        title: album.title.replace("Pictues", "Pictures"),
        slug,
        date,
        description: album.description ?? "",
        createdAt: latest?.toISOString() ?? null,
        gallery: !NOT_GALLERY.test(album.title),
        photos: [],
      };
      bySlug.set(slug, planned);
      const dir = path.join(photosDir, source, album.dir ?? album.slug);
      for (const p of album.photos) {
        if (seen.has(p.fbid)) continue;
        seen.add(p.fbid);
        const takenAt = parseDate(p.date) ?? (date ? new Date(`${date}T12:00:00Z`) : latest);
        planned.photos.push({ ref: ref(p.fbid), file: path.join(dir, p.file), caption: p.caption, takenAt: takenAt?.toISOString() ?? null });
      }
    }
  }

  const content: SeedContent | null = existsSync(contentFile)
    ? {
        settings: cfg.settings ?? {},
        heroRef: cfg.heroImage && ref(cfg.heroImage.fbid),
        events: cfg.events ?? [],
        posts: (cfg.posts ?? []).map(({ cover, ...p }) => ({ ...p, coverRef: cover && ref(cover.fbid) })),
      }
    : null;
  return { albums: [...bySlug.values()].filter((a) => a.photos.length), content };
}
