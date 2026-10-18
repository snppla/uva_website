"use server";

import { eq } from "drizzle-orm";
import { db, images, settings } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { bool, contentChanged, errorMessage, fileField, storeImage, removeImage, type FormState } from "@/lib/admin";
import { SETTINGS, type SettingKey } from "@/lib/settings";

async function save(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Delete an image that was uploaded as a setting (not part of a gallery album). */
async function removeSettingImage(key: string) {
  if (!key) return;
  const [img] = await db.select().from(images).where(eq(images.key, key));
  if (img && img.albumId === null) await removeImage(img.id);
}

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const rows = await db.select().from(settings);
  const current = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  for (const key of Object.keys(SETTINGS) as SettingKey[]) {
    if (SETTINGS[key].type === "image") {
      try {
        const file = fileField(fd, key);
        if (file) {
          const img = await storeImage(file);
          await save(key, img.key);
          await removeSettingImage(current[key]);
        } else if (bool(fd, `${key}:remove`)) {
          await save(key, "");
          await removeSettingImage(current[key]);
        }
      } catch (e) {
        return { error: errorMessage(e) };
      }
      continue;
    }
    const value = fd.get(key);
    if (typeof value === "string") await save(key, value.trim());
  }
  contentChanged();
  return { message: "Saved." };
}
