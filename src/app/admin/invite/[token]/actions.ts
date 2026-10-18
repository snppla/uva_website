"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { str, type FormState } from "@/lib/admin";
import { InviteError, MIN_PASSWORD, acceptInvite } from "@/lib/invites";

export async function acceptInviteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  const email = str(fd, "email");
  const password = str(fd, "password");
  if (!name) return { error: "Please enter your name." };
  if (password.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (password !== str(fd, "confirmPassword")) return { error: "Passwords don't match." };

  let adminId: number;
  try {
    ({ id: adminId } = await acceptInvite(str(fd, "token"), { name, email, password }));
  } catch (e) {
    if (e instanceof InviteError) return { error: e.message };
    throw e;
  }
  await createSession(adminId);
  redirect("/admin");
}
