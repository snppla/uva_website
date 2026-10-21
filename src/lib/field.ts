// Reads the flying field's location out of the admin-editable "fieldAddress"
// setting, e.g. "UVA Field\n9999 Saratoga Road\nSaratoga Springs, UT 84043\n( 40.363372, -111.901728 )".

export type FieldLocation = {
  /** Address lines as shown to visitors, without the coordinates line. */
  lines: string[];
  name?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
};

export function parseFieldLocation(text: string): FieldLocation {
  const all = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const coords = text.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  const lines = all.filter((l) => !/^\(?\s*-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+\s*\)?$/.test(l));
  // "Saratoga Springs, UT 84043" or "Saratoga Springs, Utah"
  const cityIndex = lines.findIndex((l) => /^[^,]+,\s*[A-Za-z .]+(\s+\d{5})?$/.test(l));
  const loc: FieldLocation = { lines };
  if (cityIndex >= 0) {
    const m = lines[cityIndex].match(/^([^,]+),\s*([A-Za-z .]+?)(?:\s+(\d{5}))?$/)!;
    Object.assign(loc, { city: m[1], region: m[2], postalCode: m[3] });
    // The line above the city is the street when it has a house number, otherwise the field's name.
    const above = lines.slice(0, cityIndex);
    if (above.length && /\d/.test(above.at(-1)!)) loc.street = above.pop();
    if (above.length) loc.name = above.join(", ");
  }
  if (coords) Object.assign(loc, { lat: Number(coords[1]), lng: Number(coords[2]) });
  return loc;
}

/** Google Maps link for directions to the field. */
export function directionsUrl(loc: FieldLocation) {
  const dest = loc.lat !== undefined ? `${loc.lat},${loc.lng}` : loc.lines.join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
