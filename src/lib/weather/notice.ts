// The field notice banner on the Weather page, set by officers in Admin → Page content.
//
// Lines starting with # are ignored. Optional lines above the message:
//   type: closed       red "Field closed" banner; the page's verdict shows CLOSED instead of GO/NO-GO
//   until: 2026-11-15  the banner disappears automatically after this date

import { FIELD } from "./field";

export type FieldNotice = { closed: boolean; text: string; until: string | null };

export function parseNotice(txt: string, today = fieldToday()): FieldNotice | null {
  let type = "info";
  let until: string | null = null;
  const msg: string[] = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("#")) continue;
    const m = !msg.join("").trim() && line.match(/^(type|until)\s*:\s*(.+)$/i);
    if (m) {
      if (m[1].toLowerCase() === "type") type = m[2].trim().toLowerCase();
      else until = m[2].trim();
      continue;
    }
    msg.push(line);
  }
  const text = msg.join("\n").trim();
  if (!text) return null;
  const validUntil = until && /^\d{4}-\d{2}-\d{2}$/.test(until) ? until : null;
  if (validUntil && today > validUntil) return null;
  return { closed: type === "closed", text, until: validUntil };
}

/** Today's date at the field, YYYY-MM-DD. */
function fieldToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: FIELD.tz });
}
