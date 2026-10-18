"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyLogin } from "@/lib/auth";
import { str, type FormState } from "@/lib/admin";

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const { admin, error } = await verifyLogin(str(fd, "email"), str(fd, "password"));
  if (!admin) return { error };
  await createSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
