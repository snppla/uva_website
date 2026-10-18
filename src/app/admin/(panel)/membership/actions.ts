"use server";

import { eq } from "drizzle-orm";
import { db, membershipPlans } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { contentChanged, int, str, type FormState } from "@/lib/admin";

export async function savePlan(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const values = {
    name: str(fd, "name"),
    price: str(fd, "price"),
    description: str(fd, "description"),
    paypalUrl: str(fd, "paypalUrl"),
    sortOrder: int(fd, "sortOrder"),
  };
  if (!values.name || !values.price) return { error: "Name and price are required." };
  if (!/^https:\/\/(www\.)?(paypal\.com|paypal\.me)\//i.test(values.paypalUrl)) {
    return { error: "The payment link must be a PayPal link (https://www.paypal.com/… or https://paypal.me/…)." };
  }
  if (id) await db.update(membershipPlans).set(values).where(eq(membershipPlans.id, id));
  else await db.insert(membershipPlans).values(values);
  contentChanged();
  return { message: id ? "Saved." : "Membership option added." };
}

export async function deletePlan(fd: FormData) {
  await requireAdmin();
  await db.delete(membershipPlans).where(eq(membershipPlans.id, int(fd, "id")));
  contentChanged();
}
