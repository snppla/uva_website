// Turns a members spreadsheet (parsed CSV rows) into member records. Understands both our own export
// format and the club's "Current Club Membership" Google Sheet.

import { expiryAfterDues, LIFETIME_EXPIRY } from "./membership";

export type ImportedMember = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amaNumber: string;
  membershipType: string;
  expiresOn: string | null;
  notes: string;
};

type Field =
  | Exclude<keyof ImportedMember, "notes">
  | "notes"
  | "fullName"
  | "duesPaid"
  | "amaExpires"
  | "optOutEmail"
  | "paymentMethod"
  | "address"
  | "joined";

// Heading → field, after lowercasing and dropping everything but letters and underscores.
const COLUMNS: Record<string, Field> = {
  firstname: "firstName",
  first: "firstName",
  firstpreferredname: "firstName",
  preferredname: "firstName",
  lastname: "lastName",
  last: "lastName",
  fullname: "fullName",
  email: "email",
  emailaddress: "email",
  emailincludeinclubemails: "email",
  emailoptout: "optOutEmail",
  phone: "phone",
  phonenumber: "phone",
  ama: "amaNumber",
  amanumber: "amaNumber",
  ama_number: "amaNumber",
  amaexp: "amaExpires",
  amaexpires: "amaExpires",
  type: "membershipType",
  membertype: "membershipType",
  membershiptype: "membershipType",
  expires: "expiresOn",
  expireson: "expiresOn",
  expiration: "expiresOn",
  expirationdate: "expiresOn",
  lastduespaid: "duesPaid",
  lastduespaidyouthageoutdate: "duesPaid",
  paymentmethod: "paymentMethod",
  address: "address",
  initialjoindate: "joined",
  joindate: "joined",
  notes: "notes",
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value: string) {
  if (DATE.test(value)) return value;
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!us) return null;
  const year = us[3].length === 2 ? `20${us[3]}` : us[3];
  return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
}

function mapHeader(row: string[]) {
  return row.map((h) => COLUMNS[h.toLowerCase().replace(/[^a-z_]/g, "")]);
}

/** Skip any title/summary rows above the headings: the header is the first row with first and last name columns. */
function findHeader(rows: string[][]) {
  const index = rows.slice(0, 30).findIndex((row) => {
    const m = mapHeader(row);
    return m.includes("firstName") && m.includes("lastName");
  });
  return index < 0 ? null : { index, mapping: mapHeader(rows[index]) };
}

function expiryFromDuesPaid(type: string, paid: string | null, amaExpires: string | null) {
  const t = type.toLowerCase();
  if (t.startsWith("life")) return LIFETIME_EXPIRY;
  // Youth membership is free and lasts as long as their AMA youth membership.
  if (t.startsWith("youth")) return amaExpires;
  return paid ? expiryAfterDues(paid) : null;
}

export function membersFromCsv(rows: string[][]): { members: ImportedMember[] } | { error: string } {
  if (!rows.length) return { error: "The file is empty." };
  const header = findHeader(rows);
  if (!header) return { error: `Couldn't find first/last name columns. Found: ${rows[0].join(", ")}` };

  const members: ImportedMember[] = [];
  for (const row of rows.slice(header.index + 1)) {
    const v: Partial<Record<Field, string>> = {};
    header.mapping.forEach((key, i) => key && !v[key] && (v[key] = (row[i] ?? "").trim()));
    if (!v.firstName || !v.lastName) continue;

    const type = v.membershipType ?? "";
    const amaExpires = v.amaExpires ? parseDate(v.amaExpires) : null;
    const expiresOn = v.expiresOn
      ? parseDate(v.expiresOn)
      : v.duesPaid !== undefined
        ? expiryFromDuesPaid(type, v.duesPaid ? parseDate(v.duesPaid) : null, amaExpires)
        : null;

    // Keep sheet columns we have no field for in the notes.
    const extras = [
      v.fullName && v.fullName !== `${v.firstName} ${v.lastName}` && `Full name: ${v.fullName}`,
      v.amaExpires && `AMA expires: ${v.amaExpires}`,
      v.duesPaid && !type.toLowerCase().match(/^(life|youth)/) && `Dues last paid: ${v.duesPaid}`,
      v.paymentMethod && `Paid by: ${v.paymentMethod}`,
      v.optOutEmail && `Email (opted out of club emails): ${v.optOutEmail}`,
      v.address && `Address: ${v.address}`,
      v.joined && `Joined: ${v.joined}`,
    ].filter(Boolean);

    members.push({
      firstName: v.firstName,
      lastName: v.lastName,
      email: (v.email ?? "").toLowerCase(),
      phone: /^n\/?a$/i.test(v.phone ?? "") ? "" : (v.phone ?? ""),
      amaNumber: v.amaNumber ?? "",
      membershipType: type,
      expiresOn,
      notes: [v.notes, extras.join("\n")].filter(Boolean).join("\n\n"),
    });
  }
  return { members };
}
