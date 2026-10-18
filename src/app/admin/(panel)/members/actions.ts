"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, members } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { errorMessage, fileField, int, str, type FormState } from "@/lib/admin";
import { clubDate } from "@/lib/dates";
import { parseCsv } from "@/lib/format";

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

function plusOneYear(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().slice(0, 10);
}

/** Extend a membership by one year from its current expiry (or from today if already expired). */
export async function renewMember(fd: FormData) {
  await requireAdmin();
  const [member] = await db.select().from(members).where(eq(members.id, int(fd, "id")));
  if (!member) return;
  const today = clubDate(new Date());
  const base = member.expiresOn && member.expiresOn > today ? member.expiresOn : today;
  await db.update(members).set({ expiresOn: plusOneYear(base) }).where(eq(members.id, member.id));
  revalidatePath("/admin/members", "layout");
}

// Accept common spreadsheet column names.
const COLUMNS: Record<string, keyof ReturnType<typeof memberValues>> = {
  firstname: "firstName",
  first: "firstName",
  lastname: "lastName",
  last: "lastName",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  ama: "amaNumber",
  amanumber: "amaNumber",
  ama_number: "amaNumber",
  type: "membershipType",
  membershiptype: "membershipType",
  expires: "expiresOn",
  expireson: "expiresOn",
  expiration: "expiresOn",
  expirationdate: "expiresOn",
  notes: "notes",
};

function parseDate(value: string) {
  if (DATE.test(value)) return value;
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!us) return null;
  const year = us[3].length === 2 ? `20${us[3]}` : us[3];
  return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
}

export async function importMembers(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const file = fileField(fd, "csv");
  if (!file) return { error: "Please choose a CSV file." };
  try {
    const [header, ...rows] = parseCsv(await file.text());
    if (!header) return { error: "The file is empty." };
    const mapping = header.map((h) => COLUMNS[h.toLowerCase().replace(/[^a-z_]/g, "")]);
    if (!mapping.includes("firstName") || !mapping.includes("lastName")) {
      return { error: `Couldn't find first/last name columns. Found: ${header.join(", ")}` };
    }

    let added = 0;
    let updated = 0;
    for (const row of rows) {
      const v: Record<string, string | null> = {};
      mapping.forEach((key, i) => key && (v[key] = (row[i] ?? "").trim()));
      if (!v.firstName || !v.lastName) continue;
      const values = {
        firstName: v.firstName,
        lastName: v.lastName,
        email: (v.email ?? "").toLowerCase(),
        phone: v.phone ?? "",
        amaNumber: v.amaNumber ?? "",
        membershipType: v.membershipType ?? "",
        expiresOn: v.expiresOn ? parseDate(v.expiresOn) : null,
        notes: v.notes ?? "",
      };
      // Match existing members by email, falling back to full name.
      const [existing] = await db
        .select({ id: members.id })
        .from(members)
        .where(
          values.email
            ? eq(members.email, values.email)
            : sql`lower(${members.firstName}) = lower(${values.firstName}) and lower(${members.lastName}) = lower(${values.lastName})`,
        );
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
