import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { and, isNull, sql } from "drizzle-orm";
import { db, adminInvites, admins } from "./index";
import { createInvite, invitePath } from "@/lib/invites";

const SETUP_LINK_HOURS = 24;

export async function bootstrap() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(admins);
  if (n > 0) return;

  // No admins yet: print a fresh one-time setup link (replacing any earlier one).
  await db.delete(adminInvites).where(and(isNull(adminInvites.invitedBy), isNull(adminInvites.usedAt)));
  const token = await createInvite({ hours: SETUP_LINK_HOURS });
  const base =
    process.env.SITE_URL?.replace(/\/+$/, "") ??
    (process.env.NODE_ENV === "production" ? "https://<your-domain>" : `http://localhost:${process.env.PORT ?? 3000}`);
  console.log(
    `\n  No admin accounts exist yet. Create the first one with this link (valid ${SETUP_LINK_HOURS} hours, one use):\n\n    ${base}${invitePath(token)}\n`,
  );
}
