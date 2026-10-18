import { contentChanged } from "@/lib/admin";
import { existingRefs, upsertAlbum } from "@/lib/seed";
import { notFound, seedAuthorized } from "@/lib/seed-auth";
import type { SeedAlbum } from "@/lib/seed-types";

// Find or create an album. Also reports which of `refs` are already imported,
// so the client can skip uploading them.
export async function POST(request: Request) {
  if (!seedAuthorized(request)) return notFound();
  const body: { album: SeedAlbum | null; refs?: string[] } = await request.json();
  const album = body.album ? await upsertAlbum(body.album) : null;
  if (album?.created) contentChanged();
  return Response.json({ albumId: album?.id ?? null, existingRefs: await existingRefs(body.refs ?? []) });
}
