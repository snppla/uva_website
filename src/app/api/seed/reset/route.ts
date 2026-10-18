import { contentChanged } from "@/lib/admin";
import { resetContent } from "@/lib/seed";
import { notFound, seedAuthorized } from "@/lib/seed-auth";

// Delete all posts, events, albums, photos and page settings (admins and members are kept).
// Requires { "confirm": "<the site's hostname>" } to avoid accidents.
export async function POST(request: Request) {
  if (!seedAuthorized(request)) return notFound();
  const { confirm } = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (confirm !== new URL(request.url).hostname && confirm !== request.headers.get("x-forwarded-host")) {
    return Response.json({ error: "Send { confirm: '<hostname>' } to reset." }, { status: 400 });
  }
  await resetContent();
  contentChanged();
  return Response.json({ reset: true });
}
