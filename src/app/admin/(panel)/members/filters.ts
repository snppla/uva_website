import { and, gte, ilike, isNull, lt, or, type SQL } from "drizzle-orm";
import { members } from "@/db";
import { addDays, clubDate } from "@/lib/dates";

export const FILTERS = {
  all: "All",
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
} as const;
export type Filter = keyof typeof FILTERS;

export const EXPIRING_DAYS = 45;

export function parseFilter(value: unknown): Filter {
  return typeof value === "string" && value in FILTERS ? (value as Filter) : "all";
}

/** WHERE clause for the member list / CSV export. */
export function memberWhere(q: string, filter: Filter, today = clubDate(new Date())) {
  const conds: (SQL | undefined)[] = [];
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(ilike(members.firstName, like), ilike(members.lastName, like), ilike(members.email, like), ilike(members.amaNumber, like)),
    );
  }
  const soon = addDays(today, EXPIRING_DAYS);
  if (filter === "active") conds.push(gte(members.expiresOn, today));
  if (filter === "expiring") conds.push(and(gte(members.expiresOn, today), lt(members.expiresOn, soon)));
  if (filter === "expired") conds.push(or(lt(members.expiresOn, today), isNull(members.expiresOn)));
  return and(...conds);
}
