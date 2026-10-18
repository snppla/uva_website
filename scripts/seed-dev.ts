/**
 * Seeds the local development database with club photos and content.
 *
 *   npm run db:seed              add anything not already imported
 *   npm run db:seed -- --reset   delete all content first
 *
 * To seed a deployed site, use `npm run seed:remote` instead (see README).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, images } from "../src/db";
import { addPhoto, applyContent, resetContent, upsertAlbum } from "../src/lib/seed";
import { buildPlan } from "./seed-plan";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.argv.includes("--force")) {
    console.error("Refusing to seed a non-local database. Use `npm run seed:remote` for a deployed site.");
    process.exit(1);
  }
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });
  if (process.argv.includes("--reset")) {
    console.log("Deleting existing content…");
    await resetContent();
  }

  const plan = buildPlan();
  for (const album of plan.albums) {
    const albumId = album.gallery ? (await upsertAlbum(album)).id : null;
    let added = 0;
    for (const photo of album.photos) {
      const file = new File([readFileSync(photo.file)], path.basename(photo.file), { type: "image/jpeg" });
      if ((await addPhoto(photo, file, albumId)) === "added") added++;
    }
    console.log(`  ${album.title}: ${added} added, ${album.photos.length - added} already there`);
  }
  if (plan.content) {
    const r = await applyContent(plan.content);
    console.log(`  content: ${r.settings} settings, ${r.eventsAdded} new events, ${r.postsAdded} new posts`);
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(images);
  console.log(`Done. ${n} images in the database.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
