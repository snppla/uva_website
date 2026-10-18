import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/storage";

// Serves uploaded photos: /uploads/images/<key>.webp
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const segments = (await ctx.params).path;
  if (segments.length !== 2 || segments[0] !== "images" || !/^[\w-]+\.webp$/.test(segments[1])) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(UPLOAD_DIR, "images", segments[1]);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(size),
      // File names are random and never reused, so they can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
