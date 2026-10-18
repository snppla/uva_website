import { contentChanged } from "@/lib/admin";
import { applyContent } from "@/lib/seed";
import { notFound, seedAuthorized } from "@/lib/seed-auth";
import type { SeedContent } from "@/lib/seed-types";

// Page settings, banner photo, events and posts.
export async function POST(request: Request) {
  if (!seedAuthorized(request)) return notFound();
  const result = await applyContent((await request.json()) as SeedContent);
  contentChanged();
  return Response.json(result);
}
