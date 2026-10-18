"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db, adminInvites, admins } from "@/db";
import { checkPassword, requireAdmin } from "@/lib/auth";
import { int, str, type FormState } from "@/lib/admin";
import { MIN_PASSWORD, createInvite, invitePath } from "@/lib/invites";
import { hashPassword } from "@/lib/password";

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const next = str(fd, "newPassword");
  if (!(await checkPassword(admin.id, str(fd, "currentPassword")))) return { error: "Current password is incorrect." };
  if (next.length < MIN_PASSWORD) return { error: `New password must be at least ${MIN_PASSWORD} characters.` };
  if (next !== str(fd, "confirmPassword")) return { error: "New passwords don't match." };
  await db.update(admins).set({ passwordHash: await hashPassword(next) }).where(eq(admins.id, admin.id));
  return { message: "Password changed." };
}

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = str(fd, "name");
  if (!name) return { error: "Name is required." };
  await db.update(admins).set({ name }).where(eq(admins.id, admin.id));
  revalidatePath("/admin", "layout");
  return { message: "Saved." };
}

export type InviteState = { error?: string; link?: string; email?: string } | undefined;

export async function inviteAdmin(_prev: InviteState, fd: FormData): Promise<InviteState> {
  const me = await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  if (!email || !name) return { error: "Name and email are required." };
  const [exists] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
  if (exists) return { error: "An admin with that email already exists." };

  // Replace any earlier pending invite for the same address.
  await db.delete(adminInvites).where(and(eq(adminInvites.email, email), isNull(adminInvites.usedAt)));
  const token = await createInvite({ email, name, invitedBy: me.id });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  revalidatePath("/admin/account");
  return { link: `${proto}://${host}${invitePath(token)}`, email };
}

export async function revokeInvite(fd: FormData) {
  await requireAdmin();
  await db.delete(adminInvites).where(and(eq(adminInvites.id, int(fd, "id")), isNull(adminInvites.usedAt)));
  revalidatePath("/admin/account");
}

export async function removeAdmin(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, "id");
  if (id === admin.id) return; // can't remove yourself
  await db.delete(admins).where(eq(admins.id, id));
  revalidatePath("/admin/account");
}
