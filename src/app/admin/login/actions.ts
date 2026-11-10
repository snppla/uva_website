"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyLogin } from "@/lib/auth";
import { str, type FormState } from "@/lib/admin";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await verifyTurnstile(fd))) return { error: TURNSTILE_ERROR };
  const { admin, error } = await verifyLogin(str(fd, "email"), str(fd, "password"));
  if (!admin) return { error };
  await createSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
