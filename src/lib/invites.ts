import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, adminInvites, admins } from "@/db";
import { hashPassword } from "./password";

export const INVITE_DAYS = 7;
export const MIN_PASSWORD = 10;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const invitePath = (token: string) => `/admin/invite/${token}`;

/** Create a one-time invite and return its token. The token itself is never stored. */
export async function createInvite({
  email = "",
  name = "",
  invitedBy = null,
  hours = INVITE_DAYS * 24,
}: {
  email?: string;
  name?: string;
  invitedBy?: number | null;
  hours?: number;
}) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(adminInvites).values({
    tokenHash: hashToken(token),
    email: email.toLowerCase(),
    name,
    invitedBy,
    expiresAt: new Date(Date.now() + hours * 3_600_000),
  });
  return token;
}

const valid = (token: string) =>
  and(eq(adminInvites.tokenHash, hashToken(token)), isNull(adminInvites.usedAt), gt(adminInvites.expiresAt, new Date()));

/** The invite for a token, if it's unused and unexpired. */
export async function findInvite(token: string) {
  const [invite] = await db.select().from(adminInvites).where(valid(token));
  return invite ?? null;
}

/** Use up the invite and create the admin account, atomically. */
export async function acceptInvite(token: string, input: { email: string; name: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    // Claiming the invite first means a token can only ever be used once.
    const [invite] = await tx.update(adminInvites).set({ usedAt: new Date() }).where(valid(token)).returning();
    if (!invite) throw new InviteError("This invite link is invalid, expired or already used.");

    const email = (invite.email || input.email).trim().toLowerCase();
    if (!email) throw new InviteError("Please enter your email.");
    const [taken] = await tx.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
    if (taken) throw new InviteError("An admin account with that email already exists.");

    const [admin] = await tx
      .insert(admins)
      .values({ email, name: input.name, passwordHash })
      .returning({ id: admins.id });
    return admin;
  });
}

export class InviteError extends Error {}
