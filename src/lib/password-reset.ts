import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { after } from "next/server";
import { db, admins, passwordResets } from "@/db";
import { site } from "@/site.config";
import { formatLongDate, formatTime } from "./dates";
import { emailConfigured, sendEmail } from "./email";
import { hashPassword } from "./password";
import { siteUrl } from "./urls";

export const RESET_MINUTES = 60;
/** Most reset emails one admin can be sent per hour, however many people ask. */
const MAX_PER_HOUR = 3;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const resetPath = (token: string) => `/admin/reset/${token}`;

/**
 * Create a reset link token for the admin with this email. Returns null (and does
 * nothing) when there's no such admin or they've had too many links this hour.
 */
export async function createPasswordReset(email: string) {
  const [admin] = await db
    .select({ id: admins.id, name: admins.name, email: admins.email })
    .from(admins)
    .where(eq(admins.email, email.trim().toLowerCase()));
  if (!admin) return null;

  const hourAgo = new Date(Date.now() - 3_600_000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(passwordResets)
    .where(and(eq(passwordResets.adminId, admin.id), gt(passwordResets.createdAt, hourAgo)));
  if (n >= MAX_PER_HOUR) return null;

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({
    tokenHash: hashToken(token),
    adminId: admin.id,
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
  });
  return { token, admin };
}

const valid = (token: string) =>
  and(
    eq(passwordResets.tokenHash, hashToken(token)),
    isNull(passwordResets.usedAt),
    gt(passwordResets.expiresAt, new Date()),
  );

/** The admin a reset token belongs to, if it's unused and unexpired. */
export async function findPasswordReset(token: string) {
  const [row] = await db
    .select({ adminId: admins.id, email: admins.email })
    .from(passwordResets)
    .innerJoin(admins, eq(admins.id, passwordResets.adminId))
    .where(valid(token));
  return row ?? null;
}

/**
 * Use up the token, set the new password and sign out every existing session,
 * atomically. Also cancels the admin's other outstanding reset links.
 */
export async function resetPassword(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const [reset] = await tx.update(passwordResets).set({ usedAt: new Date() }).where(valid(token)).returning();
    if (!reset) return null;
    await tx.delete(passwordResets).where(and(eq(passwordResets.adminId, reset.adminId), isNull(passwordResets.usedAt)));
    const [admin] = await tx
      .update(admins)
      .set({ passwordHash, sessionVersion: sql`${admins.sessionVersion} + 1` })
      .where(eq(admins.id, reset.adminId))
      .returning({ id: admins.id, name: admins.name, email: admins.email });
    return admin ?? null;
  });
}

/**
 * Email the admin that their password just changed, so they find out if it wasn't them.
 * Sent after the response; does nothing when email isn't set up.
 */
export function alertPasswordChanged(admin: { name: string; email: string }, how: "changed" | "reset") {
  if (!emailConfigured()) return;
  const now = new Date();
  after(async () => {
    try {
      await sendEmail({
        to: admin.email,
        subject: `Your ${site.shortName} website password was changed`,
        text:
          `Hi ${admin.name},\n\n` +
          `The password for your ${site.name} website admin account (${admin.email}) was ` +
          `${how === "reset" ? "reset using a forgot-password link" : "changed"} on ` +
          `${formatLongDate(now)} at ${formatTime(now)}. You've been signed out on your other devices.\n\n` +
          `If that was you, there's nothing else to do.\n\n` +
          `If it wasn't, reset your password right away at ${siteUrl()}/admin/forgot ` +
          `and let another club officer know.`,
      });
    } catch (e) {
      console.error("Password change alert email failed:", e);
    }
  });
}
