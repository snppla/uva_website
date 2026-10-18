import { asc } from "drizzle-orm";
import { db, members } from "@/db";
import { getAdmin } from "@/lib/auth";
import { clubDate } from "@/lib/dates";
import { toCsv } from "@/lib/format";
import { memberWhere, parseFilter } from "../filters";

export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const today = clubDate(new Date());
  const rows = await db
    .select()
    .from(members)
    .where(memberWhere(params.get("q")?.trim() ?? "", parseFilter(params.get("filter")), today))
    .orderBy(asc(members.lastName), asc(members.firstName));

  const csv = toCsv([
    ["First Name", "Last Name", "Email", "Phone", "AMA Number", "Membership Type", "Expires On", "Notes"],
    ...rows.map((m) => [m.firstName, m.lastName, m.email, m.phone, m.amaNumber, m.membershipType, m.expiresOn, m.notes]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
