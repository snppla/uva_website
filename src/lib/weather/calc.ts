// Flying math for the Weather page: runway wind components, sun glare, go/no-go ratings
// and flying windows. Pure functions, shared by the page's components.

import { FIELD, type Runway, type Tolerance } from "./field";

/* ---------- Small helpers ---------- */

export const ok = (v: number | null | undefined): v is number => v !== null && v !== undefined && !Number.isNaN(v);
/** Rounded number, or an en dash when there's no value. */
export const r0 = (v: number | null | undefined) => (ok(v) ? String(Math.round(v)) : "–");
const CARD16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const norm = (d: number) => ((d % 360) + 360) % 360;
export const cardinal = (d: number | null | undefined) => (ok(d) ? CARD16[Math.round(norm(d) / 22.5) % 16] : "–");
export const rwyNum = (h: number) => String(Math.round(norm(h) / 10) % 36 || 36).padStart(2, "0");
/** 13 -> "1p" */
export const hourLabel = (h: number) => (h % 12 || 12) + (h < 12 ? "a" : "p");
/** 13 -> "1 PM" */
export const hourLong = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
/** "2026-11-07T17:05" -> "5:05 PM" */
export const clock = (iso: string) => {
  const h = +iso.slice(11, 13);
  return `${h % 12 || 12}:${iso.slice(14, 16)} ${h < 12 ? "AM" : "PM"}`;
};
/** "Today", "Tomorrow" or "Sat, Nov 8" for a YYYY-MM-DD date. */
export function dayName(date: string, todayStr: string) {
  if (date === todayStr) return "Today";
  const d = new Date(date + "T12:00:00");
  const t = new Date(todayStr + "T12:00:00");
  if (Math.round((d.getTime() - t.getTime()) / 864e5) === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/* ---------- Weather codes ---------- */

const WMO: Record<number, [string, string, string?]> = {
  0: ["Clear", "☀️", "🌙"], 1: ["Mostly clear", "🌤️", "🌙"], 2: ["Partly cloudy", "⛅", "☁️"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Freezing fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"], 56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"], 66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Heavy showers", "⛈️"], 85: ["Snow showers", "🌨️"], 86: ["Snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm, hail", "⛈️"], 99: ["Thunderstorm, hail", "⛈️"],
};
export function wx(code: number | null, isDay: number | boolean = 1) {
  const w = (ok(code) && WMO[code]) || ["—", "❔"];
  return { text: w[0], icon: !isDay && w[2] ? w[2] : w[1] };
}

/* ---------- Forecast data ---------- */

type Series = (number | null)[];

/** The parts of Open-Meteo's forecast response the page uses. */
export type Forecast = {
  utc_offset_seconds: number;
  hourly_units?: { visibility?: string };
  current: {
    time: string;
    temperature_2m: number | null;
    relative_humidity_2m: number | null;
    apparent_temperature: number | null;
    dew_point_2m: number | null;
    is_day: number;
    precipitation: number | null;
    weather_code: number | null;
    cloud_cover: number | null;
    pressure_msl: number | null;
    wind_speed_10m: number | null;
    wind_direction_10m: number | null;
    wind_gusts_10m: number | null;
  };
  hourly: { time: string[] } & Record<
    | "temperature_2m" | "dew_point_2m" | "precipitation_probability" | "precipitation" | "weather_code" | "cloud_cover"
    | "visibility" | "wind_speed_10m" | "wind_direction_10m" | "wind_gusts_10m" | "wind_speed_80m" | "wind_direction_80m"
    | "wind_speed_120m" | "wind_direction_120m" | "wind_speed_180m" | "wind_direction_180m" | "cloud_cover_low" | "is_day"
    | "pressure_msl",
    Series
  >;
  daily: { time: string[]; sunrise: string[]; sunset: string[] } & Record<
    | "weather_code" | "temperature_2m_max" | "temperature_2m_min" | "uv_index_max" | "precipitation_probability_max"
    | "wind_speed_10m_max" | "wind_gusts_10m_max",
    Series
  >;
};

export function forecastUrl() {
  const p = new URLSearchParams({
    latitude: String(FIELD.lat),
    longitude: String(FIELD.lon),
    timezone: FIELD.tz,
    forecast_days: "7",
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly:
      "temperature_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,cloud_cover_low,is_day,pressure_msl",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max",
  });
  return "https://api.open-meteo.com/v1/forecast?" + p;
}

export function airQualityUrl() {
  return `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${FIELD.lat}&longitude=${FIELD.lon}&current=us_aqi,pm2_5&timezone=${encodeURIComponent(FIELD.tz)}`;
}

/** One forecast hour. Times are local to the field. */
export type Hour = {
  t: string;
  date: string;
  hour: number;
  temp: number | null;
  dew: number | null;
  pop: number | null;
  precip: number | null;
  code: number | null;
  cloud: number | null;
  /** Miles */
  vis: number | null;
  wind: number | null;
  dir: number | null;
  gust: number | null;
  w80: number | null;
  d80: number | null;
  w120: number | null;
  d120: number | null;
  w180: number | null;
  d180: number | null;
  cloudLow: number | null;
  isDay: number;
  msl: number | null;
  /** Sun position at the middle of the hour, degrees true / above the horizon. */
  sunAz: number;
  sunEl: number;
};

export function buildHours(d: Forecast): Hour[] {
  const H = d.hourly;
  const vu = d.hourly_units?.visibility || "m";
  const visToMi = vu.includes("ft") ? 1 / 5280 : 1 / 1609.344;
  const offsetMs = (d.utc_offset_seconds || 0) * 1000;
  return H.time.map((t, i) => {
    const sun = sunPos(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10), +t.slice(11, 13), 30) - offsetMs);
    const vis = H.visibility[i];
    return {
      t,
      date: t.slice(0, 10),
      hour: +t.slice(11, 13),
      temp: H.temperature_2m[i],
      dew: H.dew_point_2m[i],
      pop: H.precipitation_probability[i],
      precip: H.precipitation[i],
      code: H.weather_code[i],
      cloud: H.cloud_cover[i],
      vis: ok(vis) ? vis * visToMi : null,
      wind: H.wind_speed_10m[i],
      dir: H.wind_direction_10m[i],
      gust: H.wind_gusts_10m[i],
      w80: H.wind_speed_80m[i],
      d80: H.wind_direction_80m[i],
      w120: H.wind_speed_120m[i],
      d120: H.wind_direction_120m[i],
      w180: H.wind_speed_180m[i],
      d180: H.wind_direction_180m[i],
      cloudLow: H.cloud_cover_low[i],
      isDay: H.is_day[i] ?? 0,
      msl: H.pressure_msl[i],
      sunAz: sun.az,
      sunEl: sun.el,
    };
  });
}

/**
 * The forecast's hours, the index of the current one, and "now": that hour with the forecast's
 * current readings and the sun's position at `at` (UTC ms) laid over it.
 */
export function currentHour(d: Forecast, at = Date.now()) {
  const hours = buildHours(d);
  const c = d.current;
  const key = c.time.slice(0, 13);
  const idx = Math.max(0, hours.findIndex((h) => h.t.startsWith(key)));
  const sun = sunPos(at);
  const now: Hour = {
    ...hours[idx],
    temp: c.temperature_2m,
    dew: c.dew_point_2m,
    wind: c.wind_speed_10m,
    dir: c.wind_direction_10m,
    gust: c.wind_gusts_10m,
    code: c.weather_code,
    isDay: c.is_day,
    precip: c.precipitation,
    cloud: c.cloud_cover,
    msl: c.pressure_msl,
    sunAz: sun.az,
    sunEl: sun.el,
  };
  return { hours, idx, sun, now };
}

/* ---------- Runways and wind ---------- */

// Wind direction from the forecast is TRUE; runway headings are MAGNETIC.
export const toMag = (trueDir: number) => norm(trueDir - FIELD.magVar);

export type Components = {
  /** Magnetic heading of the runway end being used. */
  h: number;
  head: number;
  cross: number;
  crossAbs: number;
  side: "left" | "right";
  num: string;
};

/** Head- and crosswind on the better end of a runway. */
export function components(speed: number, dirTrue: number, rwyMag: number): Components {
  const dir = toMag(dirTrue);
  const ends = [rwyMag, norm(rwyMag + 180)].map((h) => {
    const a = ((dir - h) * Math.PI) / 180;
    return { h, head: speed * Math.cos(a), cross: speed * Math.sin(a) };
  });
  const best = ends[0].head >= ends[1].head ? ends[0] : ends[1];
  return { ...best, crossAbs: Math.abs(best.cross), side: best.cross > 0 ? "right" : "left", num: rwyNum(best.h) };
}

export type RunwayComponents = Components & { rwy: Runway };

/** Components for every runway, plus the one to use (main unless the cross runway is clearly better). */
export function runwayChoice(speed: number, dirTrue: number) {
  const all: RunwayComponents[] = FIELD.runways.map((r) => ({ ...components(speed, dirTrue, r.hdg), rwy: r }));
  let best = all[0];
  for (const c of all.slice(1)) {
    if (c.crossAbs < best.crossAbs - FIELD.crossRunwayMargin) best = c;
  }
  return { best, all };
}

/** What a standard windsock should look like: each of its 5 stripes fills at about 3 knots. */
export function sockText(wind: number | null, gust: number | null, dirTrue: number | null) {
  const stripes = (v: number) => Math.min(5, Math.round((v * 0.869) / 3));
  if (!ok(wind) || wind < 2 || !ok(dirTrue)) return "Hanging limp (calm)";
  const s = stripes(wind);
  const g = ok(gust) ? stripes(gust) : 0;
  const main = s >= 5 ? "Fully extended" : `About ${s || 1} of 5 stripes`;
  return `${main}, pointing ${cardinal(dirTrue + 180)}${g > s ? `, jumping to ${g >= 5 ? "full" : g + " stripes"} in gusts` : ""}`;
}

/* ---------- Sun ---------- */

/**
 * Sun position (azimuth ° true from north, elevation ° above horizon) for a UTC time in ms.
 * Low-precision solar formulas, good to well under a degree, which is plenty for glare.
 */
export function sunPos(ms: number, lat = FIELD.lat, lon = FIELD.lon) {
  const r = Math.PI / 180;
  const d = ms / 864e5 - 10957.5; // days since J2000.0
  const g = (357.529 + 0.98560028 * d) * r; // mean anomaly
  const q = 280.459 + 0.98564736 * d; // mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r;
  const e = (23.439 - 0.00000036 * d) * r;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24) * 15;
  const H = (gmst + lon) * r - ra; // local hour angle
  const la = lat * r;
  const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.cos(la) * Math.tan(dec) - Math.sin(la) * Math.cos(H));
  return { az: norm(az / r), el: el / r };
}

const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** Low sun in front of the pilots (skipped when it's overcast). */
export function isGlare(h: Pick<Hour, "sunAz" | "sunEl" | "cloud">) {
  const G = FIELD.glare;
  return (
    ok(h.sunEl) && h.sunEl > 0 && h.sunEl <= G.maxElev &&
    angDiff(h.sunAz, FIELD.pilotFacingTrue) <= G.halfAngle && !(ok(h.cloud) && h.cloud >= G.maxCloud)
  );
}

/* ---------- Conditions ---------- */

/** US AQI categories (EPA). */
export const aqiText = (a: number) =>
  a <= 50 ? "Good" : a <= 100 ? "Moderate" : a <= 150 ? "Unhealthy for sensitive groups"
    : a <= 200 ? "Unhealthy" : a <= 300 ? "Very unhealthy" : "Hazardous";

/** Estimated cloud base, ft above the field: about 1,000 ft for every 4.4°F of temperature/dew point spread. */
export function cloudBase(tempF: number | null, dewF: number | null) {
  if (!ok(tempF) || !ok(dewF)) return null;
  return Math.max(0, ((tempF - dewF) / 4.4) * 1000);
}

export function densityAltitude(tempF: number | null, mslHpa: number | null, elevFt: number) {
  if (!ok(tempF) || !ok(mslHpa)) return null;
  const altimeter = mslHpa * 0.02953;
  const pa = elevFt + (29.92 - altimeter) * 1000;
  const tc = ((tempF - 32) * 5) / 9;
  const isa = 15 - (2 * pa) / 1000;
  return pa + 120 * (tc - isa);
}

/* ---------- Ratings ---------- */

/** 0 = go, 1 = caution, 2 = no-go */
export type Level = 0 | 1 | 2;
/** A reason behind a rating: l = its level, or "g" for the sun-glare heads-up. */
export type Reason = { l: 1 | 2 | "g"; msg: string };
export type Assessment = { lvl: Level; reasons: Reason[]; glare: boolean };
export type Rated = Hour & { a: Assessment };

/** Rates an hour on its weather alone, for the pilot's wind tolerance. */
export function assess(h: Hour, P: Tolerance): Assessment {
  const reasons: Reason[] = [];
  let lvl: Level = 0;
  const add = (l: Level, msg: string) => {
    if (l > 0) reasons.push({ l: l as 1 | 2, msg });
    lvl = Math.max(lvl, l) as Level;
  };
  const grade = (v: number | null, [g, c]: [number, number]): Level => (!ok(v) ? 0 : v <= g ? 0 : v <= c ? 1 : 2);

  add(grade(h.wind, P.wind), `Wind ${r0(h.wind)} mph`);
  add(grade(h.gust, P.gust), `Gusts ${r0(h.gust)} mph`);
  if (ok(h.wind) && ok(h.dir)) {
    const { best } = runwayChoice(h.wind, h.dir);
    add(grade(best.crossAbs, P.xwind), `Crosswind ${r0(best.crossAbs)} mph on rwy ${best.num}`);
  }
  if (ok(h.gust) && ok(h.wind)) {
    const spread = h.gust - h.wind;
    if (spread >= 12) add(2, `Very gusty (${r0(spread)} mph swings)`);
    else if (spread >= 8) add(1, `Gusty (${r0(spread)} mph swings)`);
  }

  const c = h.code ?? -1;
  const fog = c === 45 || c === 48;
  if ([95, 96, 99].includes(c)) add(2, "Thunderstorms");
  else if (c >= 56 && c <= 86) add(2, wx(c).text);
  else if (c >= 51 && c <= 55) add(1, wx(c).text);
  else if (fog) add(2, "Fog");
  if (ok(h.precip) && h.precip >= 0.01 && !(c >= 51)) add(1, "Some precipitation");
  if (ok(h.pop)) {
    if (h.pop >= 60) add(2, `${h.pop}% chance of precip`);
    else if (h.pop >= 30) add(1, `${h.pop}% chance of precip`);
  }
  if (ok(h.vis)) {
    if (h.vis < 1.5) add(2, `Visibility ${h.vis.toFixed(1)} mi`);
    else if (h.vis < 4) add(1, `Visibility ${h.vis.toFixed(1)} mi`);
  }
  if (ok(h.temp) && ok(h.dew) && h.temp - h.dew <= 3 && !fog) add(1, "Fog or dew likely");
  if (ok(h.temp)) {
    if (h.temp <= 20) add(1, `Cold (${r0(h.temp)}°F): keep LiPos warm`);
    else if (h.temp >= 100) add(1, `Hot (${r0(h.temp)}°F): watch motor & battery temps`);
  }
  // Wind aloft at the forecast's 120 m (~400 ft) and 180 m (~590 ft) levels
  const aloft = ([[h.w120, 400], [h.w180, 590]] as [number | null, number][])
    .filter((p): p is [number, number] => ok(p[0]))
    .sort((p, q) => q[0] - p[0])[0];
  if (aloft && ok(h.wind) && aloft[0] - h.wind >= 12) add(1, `Stronger wind aloft (${r0(aloft[0])} mph at ${aloft[1]} ft)`);
  // Low clouds: pilots could lose sight of the model.
  // Below ~400 ft with a mostly solid low layer there's no room for a normal pattern: no-go
  const base = cloudBase(h.temp, h.dew);
  if (ok(base) && base < FIELD.lowCloudFt && ok(h.cloudLow) && h.cloudLow >= 60 && !fog) {
    const vlow = base < 400 && h.cloudLow >= 80;
    add(vlow ? 2 : 1, `${vlow ? "Very low" : "Low"} clouds, base ~${Math.round(base / 100) * 100} ft AGL`);
  }
  // Sun glare is its own heads-up label, not a CAUTION: it doesn't change the rating
  let glare = false;
  if (h.isDay && isGlare(h)) {
    glare = true;
    reasons.push({ l: "g", msg: "Sun in pilots' eyes (low in the SW)" });
  }
  return { lvl, reasons, glare };
}

export type Window = { start: Rated; end: Rated; n: number };

/** Hours that count toward a flying window: daylight, rated `level` or better. */
const flyable = (h: Rated, level: number) => !!h.isDay && h.a.lvl <= level;

/** Longest stretch of consecutive daylight hours rated `level` or better. */
export function bestWindow(hours: Rated[], level = 0): Window | null {
  let best: Window | null = null;
  let cur: Window | null = null;
  for (const h of hours) {
    if (flyable(h, level)) {
      if (!cur) cur = { start: h, end: h, n: 0 };
      cur.end = h;
      cur.n++;
      if (!best || cur.n > best.n) best = { ...cur };
    } else cur = null;
  }
  return best;
}

/** Earliest stretch of at least `min` consecutive good daylight hours. */
export function firstWindow(hours: Rated[], min = 2, level = 0): Window | null {
  let cur: Window | null = null;
  for (const h of hours) {
    if (flyable(h, level)) {
      if (!cur) cur = { start: h, end: h, n: 0 };
      cur.end = h;
      cur.n++;
    } else {
      if (cur && cur.n >= min) return cur;
      cur = null;
    }
  }
  return cur && cur.n >= min ? cur : null;
}

export const windowText = (w: Window) => `${hourLabel(w.start.hour)}–${hourLabel((w.end.hour + 1) % 24)}`;

export type Trend = { icon: string; title: string; detail: string; shift?: string };

/**
 * Wind over the next few hours compared with now: picking up, easing, or steady,
 * plus a heads-up if the favored runway is likely to change.
 */
export function windTrend(now: Hour, hours: Hour[], idx: number): Trend | null {
  const next = hours.slice(idx + 1, idx + 1 + FIELD.trendHours).filter((h) => ok(h.wind));
  if (!next.length || !ok(now.wind)) return null;
  const nowWind = now.wind;
  const peak = next.reduce((a, b) => (b.wind! > a.wind! ? b : a));
  const low = next.reduce((a, b) => (b.wind! < a.wind! ? b : a));
  let t: Trend;
  if (peak.wind! - nowWind >= 4)
    t = { icon: "📈", title: "Wind picking up:", detail: `${r0(nowWind)} → ${r0(peak.wind)} mph by ${hourLong(peak.hour)}${ok(peak.gust) ? ` (gusts ${r0(peak.gust)})` : ""}` };
  else if (nowWind - low.wind! >= 4)
    t = { icon: "📉", title: "Wind easing:", detail: `${r0(nowWind)} → ${r0(low.wind)} mph by ${hourLong(low.hour)}` };
  else t = { icon: "➡️", title: "Wind speed steady", detail: `around ${r0(nowWind)} mph for the next ${FIELD.trendHours} hours` };
  // Runway change: first upcoming hour where a different runway end is favored (ignoring calm hours)
  if (nowWind > FIELD.calmMph && ok(now.dir)) {
    const cur = runwayChoice(nowWind, now.dir).best.num;
    const sw = next.find((h) => h.wind! > FIELD.calmMph && ok(h.dir) && runwayChoice(h.wind!, h.dir).best.num !== cur);
    if (sw) t.shift = `wind shifts to ${cardinal(sw.dir)}: runway ${runwayChoice(sw.wind!, sw.dir!).best.num} likely by ${hourLong(sw.hour)}`;
  }
  return t;
}
