import "server-only";

// Latest reports from the nearby CWOP weather station, read from findu.com. Browsers can't read
// findu directly (http only, no cross-site access), so the page asks /api/weather/station, which
// calls this. Each station is fetched from findu at most once every 2 minutes.

export type StationReport = { time: string; tempF: number; dir: number; mph: number; gust: number; rh: number; mb: number };
export type StationData = { call: string; fetched: string; reports: StationReport[] };

const CACHE_MS = 2 * 60 * 1000;
const cache = new Map<string, { at: number; data: Promise<StationData> }>();

export function getStation(call: string): Promise<StationData> {
  const hit = cache.get(call);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = fetchStation(call);
  cache.set(call, { at: Date.now(), data });
  // Don't hold on to a failure: the next request tries findu again
  data.catch(() => cache.delete(call));
  return data;
}

async function fetchStation(call: string): Promise<StationData> {
  const r = await fetch(`http://www.findu.com/cgi-bin/wx.cgi?call=${encodeURIComponent(call)}&last=3`, {
    headers: { "User-Agent": "UVA-Flight-Weather (Utah Valley Aeromodelers club website)" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`findu ${r.status}`);
  return { call, fetched: new Date().toISOString(), reports: parse(await r.text()) };
}

// findu's table rows: time (UTC, yyyymmddhhmmss), temp F, wind dir, speed mph, gust mph,
// rain 1hr, rain 24hr, rain since midnight, humidity %, barometer mb. Newest first.
function parse(html: string): StationReport[] {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const n = String.raw`\s+(-?[\d.]+)`;
  const re = new RegExp(String.raw`\b(\d{14})` + n.repeat(9), "g");
  const out: StationReport[] = [];
  let m;
  while ((m = re.exec(text)) && out.length < 6) {
    const t = m[1];
    out.push({
      time: `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}Z`,
      tempF: +m[2],
      dir: +m[3],
      mph: +m[4],
      gust: +m[5],
      rh: +m[9],
      mb: +m[10],
    });
  }
  return out;
}
