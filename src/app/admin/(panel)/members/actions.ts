"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, members } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { errorMessage, fileField, int, str, type FormState } from "@/lib/admin";
import { clubDate } from "@/lib/dates";
import { canRenew, expiryAfterDues } from "@/lib/membership";
import { parseCsv } from "@/lib/format";
import { membersFromCsv } from "@/lib/member-import";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function memberValues(fd: FormData) {
  return {
    firstName: str(fd, "firstName"),
    lastName: str(fd, "lastName"),
    email: str(fd, "email").toLowerCase(),
    phone: str(fd, "phone"),
    amaNumber: str(fd, "amaNumber"),
    membershipType: str(fd, "membershipType"),
    expiresOn: str(fd, "expiresOn") || null,
    notes: str(fd, "notes"),
  };
}

export async function saveMember(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const values = memberValues(fd);
  if (!values.firstName || !values.lastName) return { error: "First and last name are required." };
  if (values.expiresOn && !DATE.test(values.expiresOn)) return { error: "Invalid expiration date." };

  if (id) await db.update(members).set(values).where(eq(members.id, id));
  else await db.insert(members).values(values);
  redirect("/admin/members");
}

export async function deleteMember(fd: FormData) {
  await requireAdmin();
  await db.delete(members).where(eq(members.id, int(fd, "id")));
  redirect("/admin/members");
}

/** Record dues paid today: the membership runs to Dec 31 of the year they're for (see lib/membership). */
export async function renewMember(fd: FormData) {
  await requireAdmin();
  const [member] = await db.select().from(members).where(eq(members.id, int(fd, "id")));
  const today = clubDate(new Date());
  if (!member || !canRenew(member.expiresOn, today)) return;
  await db.update(members).set({ expiresOn: expiryAfterDues(today) }).where(eq(members.id, member.id));
  revalidatePath("/admin/members", "layout");
}

export async function importMembers(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const file = fileField(fd, "csv");
  if (!file) return { error: "Please choose a CSV file." };
  try {
    const parsed = membersFromCsv(parseCsv(await file.text()));
    if ("error" in parsed) return { error: parsed.error };

    let added = 0;
    let updated = 0;
    for (const values of parsed.members) {
      // Match existing members by AMA number, then email, then full name.
      const byName = sql`lower(${members.firstName}) = lower(${values.firstName}) and lower(${members.lastName}) = lower(${values.lastName})`;
      const keys = [
        values.amaNumber && eq(members.amaNumber, values.amaNumber),
        values.email && eq(members.email, values.email),
        byName,
      ].filter((k) => !!k);
      let existing: { id: number } | undefined;
      for (const key of keys) {
        [existing] = await db.select({ id: members.id }).from(members).where(key);
        if (existing) break;
      }
      if (existing) {
        await db.update(members).set(values).where(eq(members.id, existing.id));
        updated++;
      } else {
        await db.insert(members).values(values);
        added++;
      }
    }
    revalidatePath("/admin/members", "layout");
    return { message: `Imported ${added} new and updated ${updated} existing members.` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
