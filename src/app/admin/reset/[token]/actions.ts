"use server";

import { redirect } from "next/navigation";
import { clearLoginFailures, createSession } from "@/lib/auth";
import { str, type FormState } from "@/lib/admin";
import { MIN_PASSWORD } from "@/lib/invites";
import { alertPasswordChanged, resetPassword } from "@/lib/password-reset";

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const password = str(fd, "password");
  if (password.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (password !== str(fd, "confirmPassword")) return { error: "Passwords don't match." };

  const admin = await resetPassword(str(fd, "token"), password);
  if (!admin) return { error: "This reset link is invalid, expired or already used. Request a new one." };
  clearLoginFailures(admin.email);
  alertPasswordChanged(admin, "reset");
  await createSession(admin.id); // every other session was signed out by the reset
  redirect("/admin");
}
