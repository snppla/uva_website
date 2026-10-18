import { contentChanged } from "@/lib/admin";
import { addPhoto } from "@/lib/seed";
import { notFound, seedAuthorized } from "@/lib/seed-auth";

// Upload one photo: multipart form with `file`, `ref`, `caption`, `takenAt`, `albumId`.
export async function POST(request: Request) {
  if (!seedAuthorized(request)) return notFound();
  const form = await request.formData();
  const file = form.get("file");
  const ref = String(form.get("ref") ?? "");
  if (!(file instanceof File) || !ref) return Response.json({ error: "file and ref are required" }, { status: 400 });
  const albumId = Number(form.get("albumId")) || null;
  const takenAt = String(form.get("takenAt") ?? "") || null;
  const status = await addPhoto({ ref, caption: String(form.get("caption") ?? ""), takenAt }, file, albumId);
  if (status === "added") contentChanged();
  return Response.json({ status });
}
