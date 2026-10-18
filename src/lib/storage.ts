import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Files live on local disk under UPLOAD_DIR:
//   images/<key>.webp, images/<key>_thumb.webp  — photos
//   files/<key>                                 — downloadable documents
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? "./data/uploads",
);
const IMAGES = path.join(UPLOAD_DIR, "images");
const FILES = path.join(UPLOAD_DIR, "files");

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function filePath(key: string) {
  return path.join(FILES, path.basename(key));
}

/** Resize and re-encode an uploaded photo. Strips EXIF (including GPS). */
export async function saveImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is too large (max 25 MB).");
  const input = Buffer.from(await file.arrayBuffer());
  const key = randomUUID();
  await mkdir(IMAGES, { recursive: true });

  // .rotate() applies the camera's orientation before metadata is dropped.
  const full = await sharp(input)
    .rotate()
    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(IMAGES, `${key}.webp`));
  await sharp(input)
    .rotate()
    .resize(600, 600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(IMAGES, `${key}_thumb.webp`));

  return { key, width: full.width, height: full.height };
}

export async function deleteImageFiles(key: string) {
  await rm(path.join(IMAGES, `${key}.webp`), { force: true });
  await rm(path.join(IMAGES, `${key}_thumb.webp`), { force: true });
}

export async function saveFile(file: File) {
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (max 25 MB).");
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const key = `${randomUUID()}${ext}`;
  await mkdir(FILES, { recursive: true });
  await writeFile(filePath(key), Buffer.from(await file.arrayBuffer()));
  return { key, size: file.size, mimeType: file.type || "application/octet-stream" };
}

export async function deleteFile(key: string) {
  await rm(filePath(key), { force: true });
}
