"use client";

import { Fragment, useState, type ReactNode } from "react";
import { FIELD, PRESETS, limitsFor, type ToleranceSetting } from "@/lib/weather/field";
import {
  aqiText, bestWindow, cardinal, clock, cloudBase, components, dayName, densityAltitude, firstWindow, hourLabel, hourLong, isGlare,
  ok, r0, runwayChoice, rwyNum, sockText, toMag, windowText, wx,
  type Forecast, type Rated, type Reason, type Trend,
} from "@/lib/weather/calc";
import type { FieldNotice } from "@/lib/weather/notice";
import type { StationData } from "@/lib/weather/station";
import { Compass } from "./compass";

/* ---------- Shared bits ---------- */

type Tone = "go" | "caution" | "nogo" | "glare";
const LEVEL_TONE: Tone[] = ["go", "caution", "nogo"];
const LEVEL_BADGE = ["GO", "CAUTION", "NO-GO"];

// Full class names so Tailwind finds them
const TONE: Record<Tone, { soft: string; border: string; bar: string }> = {
  go: { soft: "bg-go-soft text-go", border: "border-l-go", bar: "bg-go" },
  caution: { soft: "bg-caution-soft text-caution", border: "border-l-caution", bar: "bg-caution-bar" },
  nogo: { soft: "bg-nogo-soft text-nogo", border: "border-l-nogo", bar: "bg-nogo" },
  glare: { soft: "bg-glare-soft text-[#a34a00]", border: "border-l-glare", bar: "bg-glare" },
};

/** Rating of an hour. Sun glare doesn't change it: it shows as a reason chip. */
function hourTone(h: Rated): { tone: Tone; label: string } {
  return { tone: LEVEL_TONE[h.a.lvl], label: LEVEL_BADGE[h.a.lvl] };
}

const REASON_CLASS: Record<Reason["l"], string> = {
  1: "bg-caution-soft text-[#7a5000]",
  2: "bg-nogo-soft text-[#8f1f26]",
  g: "bg-glare-soft text-[#8a3f00]",
};

function ReasonChips({ reasons, empty, small }: { reasons: Reason[]; empty: string; small?: boolean }) {
  const size = small ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-sm";
  return (
    <ul className={`flex flex-wrap ${small ? "gap-1" : "mt-2 gap-1.5"}`}>
      {reasons.length ? (
        reasons.map((r, i) => (
          <li key={i} className={`rounded-full ${size} ${REASON_CLASS[r.l]}`}>
            {r.msg}
          </li>
        ))
      ) : (
        <li className={`rounded-full bg-slate-100 ${size}`}>{empty}</li>
      )}
    </ul>
  );
}

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${TONE[tone].soft}`}>{children}</span>;
}

/** Arrow pointing the way the wind is blowing TO. */
function DirArrow({ dir, className = "text-brand-500" }: { dir: number | null; className?: string }) {
  if (!ok(dir)) return null;
  return (
    <span className={`inline-block w-[1em] text-center font-black ${className}`} style={{ transform: `rotate(${dir + 180}deg)` }} aria-hidden>
      ↑
    </span>
  );
}

export function Card({ title, note, children, className = "" }: { title: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      <h2 className="heading mb-3 text-xl text-brand-950">
        {title}
        {note && <small className="ml-2 font-sans text-sm font-normal tracking-normal text-slate-500 normal-case">{note}</small>}
      </h2>
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <span className="font-normal text-slate-500">{children}</span>;
const Note = ({ children }: { children: ReactNode }) => <div className="mt-3 text-sm text-slate-500">{children}</div>;

/* ---------- Banners ---------- */

export function NoticeBanner({ notice }: { notice: FieldNotice }) {
  const until = notice.until
    ? new Date(notice.until + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : null;
  return (
    <section className={`card border-l-[6px] p-4 ${notice.closed ? "border-l-nogo bg-nogo-soft" : "border-l-brand-500 bg-brand-50"}`}>
      <h3 className={`font-bold ${notice.closed ? "text-nogo" : "text-brand-700"}`}>{notice.closed ? "⛔ Field closed" : "📌 Field notice"}</h3>
      <p className="mt-1 whitespace-pre-line">{notice.text}</p>
      {until && <div className="mt-1 text-sm text-slate-500">Through {until}</div>}
    </section>
  );
}

export type Alert = { properties?: { id?: string; event?: string; headline?: string; ends?: string; expires?: string } };

export function AlertBanner({ alert }: { alert: Alert }) {
  const p = alert.properties || {};
  const ends = p.ends || p.expires;
  return (
    <section className="card border-l-[6px] border-l-nogo bg-nogo-soft p-4">
      <h3 className="font-bold text-nogo">⚠️ {p.event}</h3>
      <p className="mt-1 text-sm">
        {p.headline}
        {ends && ` · until ${new Date(ends).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`}
      </p>
    </section>
  );
}

/* ---------- Verdict ---------- */

type VerdictProps = {
  now: Rated;
  hours: Rated[];
  idx: number;
  todayStr: string;
  trend: Trend | null;
  aqi: number | null;
  closed: boolean;
  tolerance: ToleranceSetting;
  /** Next sunrise (field-local time) when it's dark now, otherwise null. */
  sunrise: string | null;
};

export function Verdict({ now, hours, idx, todayStr, trend, aqi, closed, tolerance, sunrise }: VerdictProps) {
  const T = limitsFor(tolerance);
  const levelName = tolerance.level === "custom" ? "your custom" : PRESETS[tolerance.level].label.toLowerCase();
  const { tone, label } = closed ? { tone: "nogo" as Tone, label: "CLOSED" } : hourTone(now);
  const title = closed
    ? "Field closed: see the notice above"
    : ["Good flying conditions", "Flyable with caution", "Not recommended right now"][now.a.lvl];

  // Best stretch of flying left today, or the next good one
  const rest = hours.slice(idx).filter((h) => h.date === todayStr);
  const win = bestWindow(rest);
  const next72 = hours.slice(idx, idx + 72);
  const nextGood = firstWindow(next72) || bestWindow(next72);
  let windowLine: ReactNode;
  if (win) {
    windowLine = (
      <>
        Best window left today: <strong className="text-brand-950">{windowText(win)}</strong> ({win.n} hr{win.n > 1 ? "s" : ""} of good conditions)
      </>
    );
  } else if (nextGood) {
    windowLine = (
      <>
        No good window left today. Next good stretch:{" "}
        <strong className="text-brand-950">
          {dayName(nextGood.start.date, todayStr)} {windowText(nextGood)}
        </strong>
      </>
    );
  } else {
    const cw = bestWindow(next72, 1);
    windowLine = cw ? (
      <>
        No fully good hours in the next 3 days. Best flyable stretch:{" "}
        <strong className="text-brand-950">
          {dayName(cw.start.date, todayStr)} {windowText(cw)}
        </strong>{" "}
        (caution)
      </>
    ) : (
      "No flyable daylight hours in the next 3 days."
    );
  }

  // Tips are information only: they don't change the rating
  const tips: string[] = [];
  // LiPos lose capacity and sag under load in the cold
  if (ok(now.temp) && now.temp <= FIELD.coldPackF)
    tips.push(`🔋 Cold packs (${r0(now.temp)}°F): LiPos lose power in the cold. Keep batteries warm until you fly, and land with extra reserve.`);
  if (aqi !== null && aqi > 100 && aqi <= 150) tips.push(`😷 Air quality is unhealthy for sensitive groups (AQI ${r0(aqi)}).`);

  return (
    <section className={`card flex flex-wrap items-center gap-5 border-l-8 p-4 sm:p-5 ${TONE[tone].border}`}>
      <div className={`heading flex-none rounded-xl px-5 py-2.5 text-3xl ${TONE[tone].soft}`}>{label}</div>
      <div className="min-w-60 flex-1">
        {sunrise && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-950 px-3 py-0.5 text-sm font-semibold text-white">
            🌙 It&apos;s dark · sunrise {sunrise.slice(0, 10) === todayStr ? "" : "tomorrow "}at {clock(sunrise)}
          </div>
        )}
        <h2 className="text-xl font-bold text-brand-950">{title}</h2>
        <div className="text-sm text-slate-500">
          Rated for {levelName} wind tolerance: good up to {T.wind[0]} mph wind, {T.gust[0]} mph gusts, {T.xwind[0]} mph crosswind
        </div>
        <ReasonChips reasons={now.a.reasons} empty="Light wind, no precipitation, good visibility" />
        {trend && (
          <div className="mt-2 text-brand-950">
            {trend.icon} <strong>{trend.title}</strong> {trend.detail}
            {trend.shift && ` · ${trend.shift}`}
          </div>
        )}
        {tips.map((t) => (
          <div key={t} className="mt-2 rounded-lg bg-brand-50 px-3 py-1.5 text-sm text-brand-950">
            {t}
          </div>
        ))}
        {!closed && <div className="mt-2">{windowLine}</div>}
      </div>
    </section>
  );
}

/* ---------- Wind & runway ---------- */

export function WindCard({ now, sun, station }: { now: Rated; sun: { az: number; el: number }; station: StationState }) {
  const choice = ok(now.wind) && ok(now.dir) ? runwayChoice(now.wind, now.dir) : null;
  const comp = choice?.best ?? null;
  const calm = !ok(now.wind) || now.wind <= FIELD.calmMph;
  const rwyLabel = FIELD.runways.map((r) => `${rwyNum(r.hdg)}/${rwyNum(r.hdg + 180)} ${r.name.toLowerCase()}`).join(" · ");
  return (
    <Card title="Wind & Runway" note={rwyLabel}>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <Compass dirTrue={now.dir} comp={comp} windSpeed={now.wind} sun={sun} />
        <div className="min-w-64 flex-1">
          <div className="text-5xl leading-none font-extrabold text-brand-950">
            {r0(now.wind)} <small className="text-base font-semibold text-slate-500">mph</small>
          </div>
          <div className="mt-1 text-slate-500">
            from {cardinal(now.dir)} ({ok(now.dir) ? r0(toMag(now.dir)) : "–"}° mag) · gusts <strong className="text-brand-950">{r0(now.gust)} mph</strong>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-slate-500">Use runway</dt>
            <dd className="font-semibold">
              {calm || !comp ? (
                <>
                  Calm: either direction <Muted>(wind {FIELD.calmMph} mph or less)</Muted>
                </>
              ) : (
                <>
                  {comp.num} <Muted>({comp.rwy.name.toLowerCase()})</Muted>
                </>
              )}
            </dd>
            {comp && (
              <>
                <dt className="text-slate-500">Headwind</dt>
                <dd className="font-semibold">{comp.head >= 0 ? `${r0(comp.head)} mph` : `Tailwind ${r0(-comp.head)} mph`}</dd>
                <dt className="text-slate-500">Crosswind</dt>
                <dd className="font-semibold">
                  {r0(comp.crossAbs)} mph {comp.crossAbs >= 1 ? `from the ${comp.side}` : ""}
                </dd>
                <dt className="text-slate-500">Gust crosswind</dt>
                <dd className="font-semibold">{ok(now.gust) && ok(now.dir) ? r0(components(now.gust, now.dir, comp.rwy.hdg).crossAbs) : "–"} mph</dd>
              </>
            )}
            <dt className="text-slate-500">Pits windsock</dt>
            <dd className="font-semibold">{sockText(now.wind, now.gust, now.dir)}</dd>
            <dt className="text-slate-500">Nearby station</dt>
            <dd className="font-semibold">
              <StationReading station={station} />
            </dd>
          </dl>
          {choice && (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="border-b border-slate-200 px-1.5 py-1.5 font-semibold">Runway</th>
                  <th className="border-b border-slate-200 px-1.5 py-1.5 font-semibold">Size</th>
                  <th className="border-b border-slate-200 px-1.5 py-1.5 font-semibold">Head</th>
                  <th className="border-b border-slate-200 px-1.5 py-1.5 font-semibold">Cross</th>
                </tr>
              </thead>
              <tbody>
                {choice.all.map((c) => (
                  <tr key={c.rwy.name} className={c === comp ? "bg-go-soft" : ""}>
                    <td className="border-b border-slate-200 px-1.5 py-1.5">
                      <strong>{c.num}</strong> <span className="text-slate-500">{c.rwy.name.toLowerCase()}</span>
                    </td>
                    <td className="border-b border-slate-200 px-1.5 py-1.5">
                      {c.rwy.len} × {c.rwy.wid} ft
                    </td>
                    <td className="border-b border-slate-200 px-1.5 py-1.5">{c.head >= 0 ? r0(c.head) : `−${r0(-c.head)}`}</td>
                    <td className="border-b border-slate-200 px-1.5 py-1.5">{r0(c.crossAbs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <Note>
        <span className="font-bold text-[#1f7fb8]">Light blue</span> = where the wind is coming from.{" "}
        <span className="font-bold text-go">Green</span> = land and take off this way, into the wind. White fence = pilot stations (facing SW). ☀ = where the
        sun is now. Wind in mph. The cross runway is recommended only when it cuts the crosswind by {FIELD.crossRunwayMargin}+ mph.
      </Note>
    </Card>
  );
}

/** undefined while loading, null when the station couldn't be reached. `at` is when it was fetched. */
export type StationState = { data: StationData | null; at: number } | undefined;

function StationReading({ station }: { station: StationState }) {
  const S = FIELD.station;
  const where = <Muted> · {S.call}, {S.where} (live)</Muted>;
  const r = station?.data?.reports[0];
  if (!station || !r) return <Muted>{station ? "No report available" : "Loading…"}</Muted>;
  const age = Math.max(0, Math.round((station.at - Date.parse(r.time)) / 60000));
  const ago = age < 60 ? `${age} min ago` : `${Math.round(age / 60)} hr ago`;
  if (age > S.staleMin)
    return (
      <>
        <Muted>No recent report (last one {ago})</Muted>
        {where}
      </>
    );
  const wind = r.mph < 1 ? "Calm" : `${cardinal(r.dir)} ${r0(r.mph)} mph${r.gust > r.mph ? `, gusts ${r0(r.gust)}` : ""}`;
  return (
    <>
      {wind} · {r0(r.tempF)}°F <Muted>· {ago}</Muted>
      {where}
    </>
  );
}

/* ---------- Conditions now ---------- */

type Tile = { lbl: string; val: ReactNode; sub: string; cls?: "warn" | "bad" | "" };

export function Conditions({ d, now, hours, idx, todayStr, aqi, more, onToggleMore }: {
  d: Forecast;
  now: Rated;
  hours: Rated[];
  idx: number;
  todayStr: string;
  aqi: number | null;
  more: boolean;
  onToggleMore: () => void;
}) {
  const c = d.current;
  const today = d.daily;
  const h0 = hours[idx];
  const da = densityAltitude(now.temp, now.msl, FIELD.elevFt);
  const vis = h0.vis;
  const spread = ok(now.temp) && ok(now.dew) ? now.temp - now.dew : null;
  const sky = wx(now.code, now.isDay);
  const uv = today.uv_index_max[0];

  const cloudTile = (): Tile => {
    const b = cloudBase(now.temp, now.dew), low = h0.cloudLow;
    const clouds = ok(low) && low >= 20;
    const v = !ok(b) ? "–" : !clouds ? "No low clouds" : b >= 10000 ? "10,000+ ft" : `~${(Math.round(b / 100) * 100).toLocaleString()} ft`;
    const below = clouds && ok(b) && b < FIELD.lowCloudFt;
    return {
      lbl: "Est. cloud base",
      val: v,
      sub: below ? "Low enough to hide a model" : `${r0(low)}% low cloud · AGL`,
      cls: below && low >= 60 ? "warn" : "",
    };
  };

  const glareTile = (): Tile => {
    // Glare hours during flying time: rest of today, or tomorrow once today's daylight is over
    const later = hours.slice(idx);
    const daylightLeft = later.some((h) => h.date === todayStr && h.isDay);
    const day = daylightLeft ? todayStr : hours.find((h, i) => i > idx && h.date !== todayStr)?.date;
    const g = day ? later.filter((h) => h.date === day && h.isDay && isGlare(h)) : [];
    const active = isGlare(now) && !!now.isDay;
    return {
      lbl: "Sun glare",
      val: g.length
        ? `${daylightLeft ? "" : "Tomorrow "}${hourLabel(g[0].hour)}–${hourLabel((g[g.length - 1].hour + 1) % 24)}`
        : `None ${daylightLeft ? "today" : "tomorrow"}`,
      sub: active ? "Now: sun is in pilots' eyes" : "Pilots face SW",
      cls: active ? "warn" : "",
    };
  };

  const daRounded = ok(da) ? Math.round(da / 100) * 100 : null;
  const tiles: Tile[] = [
    {
      lbl: "Temperature",
      val: `${r0(now.temp)}°F`,
      sub: `Feels like ${r0(c.apparent_temperature)}°F`,
      cls: ok(now.temp) && (now.temp <= 20 || now.temp >= 100) ? "warn" : "",
    },
    { lbl: "Sky", val: `${sky.icon} ${r0(now.cloud)}%`, sub: sky.text },
    {
      lbl: "Precip chance",
      val: `${r0(h0.pop)}%`,
      sub: "this hour",
      cls: ok(h0.pop) && h0.pop >= 60 ? "bad" : ok(h0.pop) && h0.pop >= 30 ? "warn" : "",
    },
    { lbl: "Visibility", val: ok(vis) ? (vis >= 10 ? "10+ mi" : `${vis.toFixed(1)} mi`) : "–", sub: "forecast", cls: ok(vis) && vis < 4 ? "warn" : "" },
    {
      lbl: "Dew point",
      val: `${r0(now.dew)}°F`,
      sub: `Spread ${r0(spread)}° · RH ${r0(c.relative_humidity_2m)}%`,
      cls: ok(spread) && spread <= 3 ? "warn" : "",
    },
    {
      lbl: "Density altitude",
      val: daRounded !== null ? `${Math.max(0, daRounded).toLocaleString()} ft` : "–",
      sub: "higher = less lift & thrust",
      cls: ok(da) && da > 7000 ? "warn" : "",
    },
    cloudTile(),
    { lbl: "Altimeter", val: ok(now.msl) ? `${(now.msl * 0.02953).toFixed(2)}"` : "–", sub: `${r0(now.msl)} hPa` },
    { lbl: "Sunrise", val: clock(today.sunrise[0]), sub: "today" },
    { lbl: "Sunset", val: clock(today.sunset[0]), sub: "today" },
    glareTile(),
    { lbl: "UV index", val: r0(uv), sub: "today max", cls: ok(uv) && uv >= 8 ? "warn" : "" },
    {
      lbl: "Air quality",
      val: aqi !== null ? `AQI ${r0(aqi)}` : "–",
      sub: aqi !== null ? aqiText(aqi) : "unavailable",
      cls: aqi !== null && aqi > 150 ? "bad" : aqi !== null && aqi > 100 ? "warn" : "",
    },
  ];
  const bg = { warn: "bg-caution-soft", bad: "bg-nogo-soft", "": "bg-brand-50" };
  // Always shown: what matters most for an RC flight. Wind has its own card above.
  // Any other tile that's flagging a problem is shown too, so it can't hide behind the button.
  const KEY_TILES = ["Precip chance", "Temperature", "Sky", "Visibility", "Sunrise", "Sunset"];
  const shown = tiles.filter((t) => KEY_TILES.includes(t.lbl) || t.cls);
  const hidden = tiles.filter((t) => !shown.includes(t));
  const tile = (t: Tile) => (
    <div key={t.lbl} className={`rounded-lg px-3 py-2.5 ${bg[t.cls || ""]}`}>
      <div className="text-xs tracking-wide text-slate-500 uppercase">{t.lbl}</div>
      <div className="text-xl font-bold text-brand-950">{t.val}</div>
      <div className="text-sm text-slate-500">{t.sub}</div>
    </div>
  );
  return (
    <Card title="Conditions Now">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
        {shown.map(tile)}
        {more && hidden.map(tile)}
      </div>
      {hidden.length > 0 && (
        <button type="button" onClick={onToggleMore} aria-expanded={more} className="btn-secondary mt-3">
          {more ? "Fewer conditions" : `More conditions (${hidden.length})`}
        </button>
      )}
    </Card>
  );
}

/* ---------- Hour by hour ---------- */

type SunTimes = { time: string[]; sunrise: string[]; sunset: string[] };

export function Hourly({ now, hours, idx, todayStr, sun }: { now: Rated; hours: Rated[]; idx: number; todayStr: string; sun: SunTimes }) {
  const list = [now, ...hours.slice(idx + 1, idx + 36)];
  const maxW = Math.max(25, ...hours.slice(idx, idx + 36).map((h) => h.gust || 0));
  const barH = (v: number | null) => Math.max(2, ((v || 0) / maxW) * 46);
  // The hour opened for details, by its time; "now" is the first card
  const [openT, setOpenT] = useState<string | null>(null);
  const openIndex = list.findIndex((h) => h.t === openT);
  const open = openIndex >= 0 ? list[openIndex] : null;
  /** Sunrise or sunset time on a date, e.g. "5:17 PM". */
  const sunAt = (date: string, which: "sunrise" | "sunset") => {
    const i = sun.time.indexOf(date);
    return i >= 0 ? clock(sun[which][i]) : "";
  };
  return (
    <Card title="Hour by Hour" note="next 36 hours · tap an hour for details">
      <div className="flex snap-x gap-2 overflow-x-auto pt-1 pb-2">
        {list.map((h, i) => {
          const w = wx(h.code, h.isDay);
          const showDate = i === 0 || h.hour === 0;
          const selected = i === openIndex;
          const night = !h.isDay;
          // Where day turns to night (or back), a marker with the sunset (or sunrise) time
          const prev = list[i - 1];
          const change = prev && !!prev.isDay !== !!h.isDay ? (night ? "sunset" : "sunrise") : null;
          return (
            <Fragment key={h.t + i}>
              {change && (
                <div className="flex w-12 flex-none flex-col items-center justify-center text-center text-[0.7rem] leading-tight text-slate-500">
                  <span className="text-lg">{change === "sunset" ? "🌇" : "🌅"}</span>
                  <span className="font-semibold text-brand-950">{change === "sunset" ? "Sunset" : "Sunrise"}</span>
                  <span>{sunAt(h.date, change)}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setOpenT(selected ? null : h.t)}
                aria-expanded={selected}
                aria-label={`${i === 0 ? "Now" : hourLong(h.hour)}${night ? ", night" : ""}`}
                className={`w-[74px] flex-none snap-start overflow-hidden rounded-lg pb-2 text-center text-sm transition-shadow hover:ring-2 ${night ? "bg-brand-950 text-brand-100 hover:ring-brand-400" : "bg-brand-50 hover:ring-brand-200"} ${selected ? (night ? "ring-2 ring-accent-400 hover:ring-accent-400" : "ring-2 ring-brand-500 hover:ring-brand-500") : ""}`}
              >
                <div className={`h-1.5 ${TONE[hourTone(h).tone].bar}`} />
                <div className={`mt-1.5 font-bold ${night ? "text-white" : "text-brand-950"}`}>{i === 0 ? "Now" : hourLabel(h.hour)}</div>
                <div className={`min-h-[1em] text-[0.7rem] ${night ? "text-brand-300" : "text-slate-500"}`}>{showDate ? dayName(h.date, todayStr) : ""}</div>
                <div className="my-0.5 text-xl">{w.icon}</div>
                <div className="font-semibold">{r0(h.temp)}°</div>
                <div className="mt-1.5 mb-1 flex h-[46px] items-end justify-center gap-[3px]" aria-hidden>
                  <span className="w-2.5 rounded-t-[3px] bg-brand-500" style={{ height: barH(h.wind) }} />
                  <span className="w-2.5 rounded-t-[3px] bg-brand-300" style={{ height: barH(h.gust) }} />
                </div>
                <div className="font-semibold">
                  <DirArrow dir={h.dir} className={night ? "text-brand-300" : undefined} />
                  {r0(h.wind)}
                  <span className={`font-normal ${night ? "text-brand-300" : "text-slate-500"}`}>/{r0(h.gust)}</span>
                </div>
                <div className={`text-xs ${night ? "text-brand-300" : "text-brand-500"}`}>{h.pop ? `💧${h.pop}%` : "\u00a0"}</div>
              </button>
            </Fragment>
          );
        })}
      </div>
      {open && <HourDetail h={open} isNow={openIndex === 0} todayStr={todayStr} onClose={() => setOpenT(null)} />}
      <div className="mt-1.5 flex flex-wrap gap-3.5 text-xs text-slate-500">
        {[
          ["bg-go", "Good"],
          ["bg-caution-bar", "Caution"],
          ["bg-nogo", "No-go"],
          ["bg-brand-500", "Wind"],
          ["bg-brand-300", "Gusts"],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1">
            <i className={`inline-block h-3 w-3 rounded-sm ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </Card>
  );
}

/** Everything the forecast says about one hour: rating and why, wind and runway, sky, and wind aloft. */
function HourDetail({ h, isNow, todayStr, onClose }: { h: Rated; isNow: boolean; todayStr: string; onClose: () => void }) {
  const { tone, label } = hourTone(h);
  const w = wx(h.code, h.isDay);
  const rc = ok(h.wind) && ok(h.dir) ? runwayChoice(h.wind, h.dir).best : null;
  const calm = !ok(h.wind) || h.wind <= FIELD.calmMph;
  const base = cloudBase(h.temp, h.dew);
  const dirText = (dir: number | null) => (ok(dir) ? `${cardinal(dir)} (${r0(toMag(dir))}° mag)` : "–");
  const rows: [string, ReactNode][] = [
    ["Wind", <>{r0(h.wind)} mph from {dirText(h.dir)}</>],
    ["Gusts", `${r0(h.gust)} mph`],
    [
      "Runway",
      calm || !rc ? (
        "Calm: either direction"
      ) : (
        <>
          {rc.num} <Muted>({rc.rwy.name.toLowerCase()})</Muted> · head {rc.head >= 0 ? r0(rc.head) : `−${r0(-rc.head)}`} · cross {r0(rc.crossAbs)} mph
        </>
      ),
    ],
    ["Temperature", `${r0(h.temp)}°F · dew point ${r0(h.dew)}°F`],
    ["Sky", `${w.text} · ${r0(h.cloud)}% cloud${ok(h.cloudLow) && h.cloudLow >= 20 ? `, ${r0(h.cloudLow)}% low` : ""}`],
    ["Precipitation", `${r0(h.pop)}% chance${ok(h.precip) && h.precip > 0 ? ` · ${h.precip.toFixed(2)} in` : ""}`],
    ["Visibility", ok(h.vis) ? (h.vis >= 10 ? "10+ mi" : `${h.vis.toFixed(1)} mi`) : "–"],
    ["Cloud base", ok(base) && ok(h.cloudLow) && h.cloudLow >= 20 ? `~${(Math.round(base / 100) * 100).toLocaleString()} ft AGL (est.)` : "No low clouds"],
    [
      "Wind aloft",
      <>
        ~260 ft {r0(h.w80)} · ~400 ft {r0(h.w120)} · ~590 ft {r0(h.w180)} mph
      </>,
    ],
    ["Daylight", h.isDay ? "Day" : "Night"],
  ];
  return (
    <div className={`mt-2 rounded-lg border-l-4 bg-brand-50 p-3 sm:p-4 ${tone === "caution" ? "border-l-caution-bar" : TONE[tone].border}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl">{w.icon}</span>
        <span className="font-bold text-brand-950">
          {isNow ? "Now" : `${dayName(h.date, todayStr)}, ${hourLong(h.hour)}`}
        </span>
        <Pill tone={tone}>{label}</Pill>
        <button type="button" onClick={onClose} className="ml-auto text-sm text-slate-500 underline hover:text-slate-700">
          Close
        </button>
      </div>
      <div className="mt-2">
        <ReasonChips reasons={h.a.reasons} empty="Good conditions" small />
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- 7-day outlook ---------- */

export function Outlook({ d, hours, idx, todayStr, openDay, onToggleDay }: {
  d: Forecast;
  hours: Rated[];
  idx: number;
  todayStr: string;
  openDay: string | null;
  onToggleDay: (date: string) => void;
}) {
  const daily = d.daily;
  return (
    <Card title="7-Day Flying Outlook" note="tap a day for hour-by-hour">
      <div className="grid gap-1.5">
        {daily.time.map((date, i) => {
          const dh = hours.filter((h, j) => h.date === date && h.isDay && (date !== todayStr || j >= idx));
          const good = dh.filter((h) => h.a.lvl === 0).length;
          const okc = dh.filter((h) => h.a.lvl === 1).length;
          const bw = bestWindow(dh) || bestWindow(dh, 1);
          const over = date === todayStr && !dh.length;
          const tone: Tone | null = over ? null : good >= 3 ? "go" : good + okc >= 2 ? "caution" : "nogo";
          const label = over ? "Daylight over" : good >= 3 ? `${good} good hrs` : good + okc >= 2 ? `${good + okc} flyable hrs` : "Poor";
          const w = wx(daily.weather_code[i]);
          const open = openDay === date;
          return (
            <div key={date}>
              <button
                type="button"
                onClick={() => onToggleDay(date)}
                aria-expanded={open}
                className={`grid w-full grid-cols-[90px_36px_90px_1fr_1fr] items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-brand-50 max-sm:grid-cols-[70px_30px_1fr] ${open ? "bg-brand-50" : "border-b border-slate-200"}`}
              >
                <div>
                  <div className="font-bold text-brand-950">
                    {dayName(date, todayStr)}{" "}
                    <span className={`inline-block font-normal text-slate-500 transition-transform max-md:hidden ${open ? "rotate-90" : ""}`}>›</span>
                  </div>
                  <div className="text-xs text-slate-500">{w.text}</div>
                </div>
                <div className="text-center text-2xl">{w.icon}</div>
                <div>
                  <strong>{r0(daily.temperature_2m_max[i])}°</strong> / {r0(daily.temperature_2m_min[i])}°
                  <div className="text-xs text-slate-500">💧 {r0(daily.precipitation_probability_max[i])}%</div>
                </div>
                <div className="max-sm:col-span-full">
                  Wind up to <strong>{r0(daily.wind_speed_10m_max[i])}</strong>, gusts <strong>{r0(daily.wind_gusts_10m_max[i])}</strong> mph
                </div>
                <div className="max-sm:col-span-full">
                  {tone ? <Pill tone={tone}>{label}</Pill> : <span className="text-sm text-slate-500">{label}</span>}{" "}
                  {bw && <span className="text-xs text-slate-500">best {windowText(bw)}</span>}
                </div>
              </button>
              {open && <DayDetail date={date} hours={hours} idx={idx} todayStr={todayStr} sun={[daily.sunrise[i], daily.sunset[i]]} />}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Hour-by-hour ratings for one day's daylight hours. */
function DayDetail({ date, hours, idx, todayStr, sun }: { date: string; hours: Rated[]; idx: number; todayStr: string; sun: [string, string] }) {
  const list = hours.filter((h, i) => h.date === date && (date !== todayStr || i >= idx) && h.isDay);
  const wrap = "-mt-1 mb-1.5 rounded-b-lg bg-brand-50 px-2.5 pt-1 pb-2.5";
  const sunLine = (
    <div className="px-0.5 pt-1.5 text-sm text-slate-500">
      Sunrise {clock(sun[0])} · Sunset {clock(sun[1])}
    </div>
  );
  if (!list.length)
    return (
      <div className={wrap}>
        {sunLine}
        <div className="px-0.5 py-2 text-sm text-slate-500">No daylight left today.</div>
      </div>
    );
  const bw = bestWindow(list);
  const cw = bw ? null : bestWindow(list, 1);
  const row = "grid grid-cols-[44px_92px_112px_104px_78px_1fr] items-center gap-2 max-md:grid-cols-[40px_auto_1fr] max-md:gap-y-1";
  return (
    <div className={wrap}>
      {sunLine}
      <div className="px-0.5 pt-1 pb-2">
        {bw ? (
          <>
            Best window: <strong>{windowText(bw)}</strong> ({bw.n} good hr{bw.n > 1 ? "s" : ""})
          </>
        ) : cw ? (
          <>
            No fully good hours. Best flyable stretch: <strong>{windowText(cw)}</strong> (caution)
          </>
        ) : (
          "No flyable hours this day."
        )}
      </div>
      <div className={`${row} px-2 pb-1 text-[0.7rem] tracking-wide text-slate-500 uppercase max-md:hidden`}>
        <span>Time</span>
        <span>Rating</span>
        <span>Wind/gust</span>
        <span>Runway</span>
        <span>Temp</span>
        <span>Why</span>
      </div>
      {list.map((h) => {
        const { tone, label } = hourTone(h);
        const w = wx(h.code, h.isDay);
        const rc = ok(h.wind) && ok(h.dir) ? runwayChoice(h.wind, h.dir).best : null;
        const calm = !ok(h.wind) || h.wind <= FIELD.calmMph;
        return (
          <div key={h.t} className={`${row} mt-1 rounded-lg border-l-4 bg-white px-2 py-1.5 text-sm ${tone === "caution" ? "border-l-caution-bar" : TONE[tone].border}`}>
            <div className="font-bold text-brand-950">{hourLabel(h.hour)}</div>
            <div>
              <Pill tone={tone}>{label}</Pill>
            </div>
            <div className="max-md:col-start-3 max-md:text-right">
              <DirArrow dir={h.dir} /> <strong>{r0(h.wind)}</strong>
              <Muted>/{r0(h.gust)}</Muted> mph
            </div>
            <div className="max-md:col-start-2">
              {calm || !rc ? (
                <Muted>Calm: either direction</Muted>
              ) : (
                <>
                  Rwy {rc.num} <Muted>· xw {r0(rc.crossAbs)}</Muted>
                </>
              )}
            </div>
            <div className="max-md:col-start-3 max-md:text-right">
              {w.icon} {r0(h.temp)}°{h.pop ? <Muted> 💧{h.pop}%</Muted> : null}
            </div>
            <div className="max-md:col-span-full">
              <ReasonChips reasons={h.a.reasons} empty="Good conditions" small />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Wind aloft ---------- */

export function Aloft({ now, h0 }: { now: Rated; h0: Rated }) {
  const rows: [string, number | null, number | null, number | null][] = [
    ["Surface (33 ft)", now.wind, now.dir, now.gust],
    ["~260 ft", h0.w80, h0.d80, null],
    ["~400 ft", h0.w120, h0.d120, null],
    ["~590 ft", h0.w180, h0.d180, null],
  ];
  const top = [h0.w120, h0.w180].filter(ok);
  const shear = top.length > 0 && ok(now.wind) && Math.max(...top) - now.wind >= 8;
  const cell = "border-b border-slate-200 px-1.5 py-2 text-left";
  return (
    <Card title="Wind Aloft" note="this hour">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-xs tracking-wide text-slate-500 uppercase">
            <th className={`${cell} font-semibold`}>Height</th>
            <th className={`${cell} font-semibold`}>Speed</th>
            <th className={`${cell} font-semibold`}>From</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, s, dir, g]) => (
            <tr key={label}>
              <td className={cell}>{label}</td>
              <td className={cell}>
                <strong>{r0(s)} mph</strong>
                {ok(g) && <span className="text-slate-500"> gusting {r0(g)}</span>}
              </td>
              <td className={cell}>
                <DirArrow dir={dir} /> {cardinal(dir)} {ok(dir) ? `(${r0(toMag(dir))}°)` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Note>
        {shear
          ? "⚠️ Wind gets noticeably stronger with height. Expect your plane to drift at altitude, and turbulence on climb-out."
          : "Wind is fairly steady with height."}{" "}
        Heights are above the field. Directions are degrees magnetic.
      </Note>
    </Card>
  );
}

/* ---------- Sources ---------- */

export function Sources() {
  const rows: [string, string][] = [
    ["Forecast", "NOAA weather models (HRRR, updated hourly, blended with GFS for later days) for a point about 0.2 mi from the field, at 4,495 ft"],
    ["Alerts", "National Weather Service, Salt Lake City office, for the field's exact location"],
    ["Sun & glare", "Calculated for the field from the date and time"],
    ["Nearby station", `Live readings from ${FIELD.station.call}, a home weather station in the CWOP network about ${FIELD.station.where} of the field, via findu.com`],
    ["Air quality", "Open-Meteo air quality model (US AQI) for the field"],
    ["Field info", "Runways, pilot stations, pits and windsock from club members"],
  ];
  return (
    <Card title="Where This Data Comes From">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <Note>
        There&apos;s no weather station at the field yet. Except for the nearby station reading, everything here is a forecast for the field, not a live
        measurement. Check the windsock before you fly.
      </Note>
    </Card>
  );
}
