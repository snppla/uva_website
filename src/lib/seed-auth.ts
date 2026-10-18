import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * The /api/seed endpoints are enabled only when SEED_API_TOKEN is set (32+
 * characters) and the request sends it as `Authorization: Bearer <token>`.
 * Otherwise they answer 404, as if they didn't exist.
 */
export function seedAuthorized(request: Request) {
  const token = process.env.SEED_API_TOKEN ?? "";
  if (token.length < 32) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const notFound = () => new Response("Not found", { status: 404 });
