/**
 * Seeds a deployed site through its /api/seed endpoints, from this computer.
 *
 *   npm run seed:remote -- https://sand.example.org            add anything not already there
 *   npm run seed:remote -- https://sand.example.org --reset    delete all content first
 *
 * The site must have SEED_API_TOKEN set; put the same value in .env.seed here
 * (SEED_API_TOKEN=...) or in your environment. Safe to re-run after an
 * interruption: photos already uploaded are skipped.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { buildPlan, type PlanPhoto } from "./seed-plan";

const CONCURRENCY = 3;

const site = process.argv.slice(2).find((a) => !a.startsWith("--"));
const token = process.env.SEED_API_TOKEN ?? "";
if (!site || !/^https?:\/\//.test(site)) fail("Usage: npm run seed:remote -- https://your-site [--reset]");
if (token.length < 32) fail("Set SEED_API_TOKEN (32+ characters) in .env.seed or your environment.");
const base = site.replace(/\/+$/, "");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function api(route: string, body: BodyInit, json = true, tries = 3): Promise<Record<string, unknown>> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${base}/api/seed/${route}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, ...(json && { "content-type": "application/json" }) },
        body,
      });
      if (res.status === 404) {
        fail("The site answered 404: check SEED_API_TOKEN matches the site's, and that the site is running this version.");
      }
      if (!res.ok) throw new Error(`${route}: HTTP ${res.status} ${await res.text()}`);
      return (await res.json()) as Record<string, unknown>;
    } catch (e) {
      if (attempt >= tries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function uploadPhoto(photo: PlanPhoto, albumId: number | null) {
  const form = new FormData();
  form.set("file", new Blob([readFileSync(photo.file)], { type: "image/jpeg" }), path.basename(photo.file));
  form.set("ref", photo.ref);
  form.set("caption", photo.caption);
  if (photo.takenAt) form.set("takenAt", photo.takenAt);
  if (albumId) form.set("albumId", String(albumId));
  const res = await api("photo", form, false);
  return res.status as string;
}

async function main() {
  const host = new URL(base).hostname;
  if (process.argv.includes("--reset")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`This deletes ALL posts, events, albums and photos on ${host}. Type the hostname to confirm: `);
    rl.close();
    if (answer.trim() !== host) fail("Not confirmed; nothing was deleted.");
    await api("reset", JSON.stringify({ confirm: host }));
    console.log("Deleted existing content.");
  }

  const plan = buildPlan();
  const total = plan.albums.reduce((n, a) => n + a.photos.length, 0);
  console.log(`Uploading ${total} photos in ${plan.albums.length} albums to ${host}…`);
  let done = 0;
  for (const album of plan.albums) {
    const res = await api("album", JSON.stringify({ album: album.gallery ? album : null, refs: album.photos.map((p) => p.ref) }));
    const albumId = res.albumId as number | null;
    const have = new Set(res.existingRefs as string[]);
    const queue = album.photos.filter((p) => !have.has(p.ref));
    done += album.photos.length - queue.length;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        await uploadPhoto(p, albumId);
        done++;
        process.stdout.write(`\r  ${done}/${total} photos`);
      }
    });
    await Promise.all(workers);
    process.stdout.write(`\r  ${done}/${total} photos  (${album.title})\n`);
  }
  if (plan.content) {
    const r = await api("content", JSON.stringify(plan.content));
    console.log(`Content: ${r.settings} settings, ${r.eventsAdded} new events, ${r.postsAdded} new posts`);
  }
  console.log("Done.");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
