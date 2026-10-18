import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { comparePassword } from "./password";
import { eq } from "drizzle-orm";
import { db, admins } from "@/db";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a long random string");
  }
  return new TextEncoder().encode(secret);
}

export type Admin = { id: number; name: string; email: string };

export async function createSession(adminId: number) {
  const token = await new SignJWT({ sub: String(adminId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in admin, or null. Deduplicated per request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const [admin] = await db
      .select({ id: admins.id, name: admins.name, email: admins.email })
      .from(admins)
      .where(eq(admins.id, Number(payload.sub)));
    return admin ?? null;
  } catch {
    return null;
  }
});

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

// Basic brute-force protection: limit failed logins per email address.
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function verifyLogin(
  email: string,
  password: string,
): Promise<{ admin?: Admin; error?: string }> {
  const key = email.toLowerCase();
  const entry = failures.get(key);
  if (entry && entry.count >= MAX_FAILURES && entry.until > Date.now()) {
    return { error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const [row] = await db.select().from(admins).where(eq(admins.email, key));
  const ok = row ? await comparePassword(password, row.passwordHash) : false;
  if (!row || !ok) {
    const count = entry && entry.until > Date.now() ? entry.count + 1 : 1;
    failures.set(key, { count, until: Date.now() + LOCKOUT_MS });
    return { error: "Incorrect email or password." };
  }
  failures.delete(key);
  return { admin: { id: row.id, name: row.name, email: row.email } };
}

export async function checkPassword(adminId: number, password: string) {
  const [row] = await db.select().from(admins).where(eq(admins.id, adminId));
  return row ? comparePassword(password, row.passwordHash) : false;
}
