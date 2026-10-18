import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getResource } from "@/lib/data";
import { filePath } from "@/lib/storage";

export async function GET(_req: Request, ctx: RouteContext<"/resources/[id]/download">) {
  const id = Number((await ctx.params).id);
  const resource = Number.isInteger(id) ? await getResource(id) : null;
  if (!resource) return new Response("Not found", { status: 404 });

  const path = filePath(resource.key);
  try {
    await stat(path);
  } catch {
    return new Response("File missing", { status: 404 });
  }
  // PDFs and images open in the browser; everything else downloads.
  const inline = /^(application\/pdf|image\/)/.test(resource.mimeType);
  const name = encodeURIComponent(resource.originalName);
  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
    headers: {
      "Content-Type": resource.mimeType,
      "Content-Length": String(resource.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${name}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
