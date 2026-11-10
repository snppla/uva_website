"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assess, clock, currentHour, dayName, forecastUrl, airQualityUrl, ok, windTrend,
  type Forecast, type Rated,
} from "@/lib/weather/calc";
import { FIELD, limitsFor } from "@/lib/weather/field";
import type { FieldNotice } from "@/lib/weather/notice";
import type { StationData } from "@/lib/weather/station";
import { Aloft, AlertBanner, Conditions, Hourly, NoticeBanner, Outlook, Sources, Verdict, WindCard, type Alert, type StationState } from "./sections";
import { ToleranceSelect, useTolerance } from "./tolerance";

const REFRESH_MS = 10 * 60 * 1000;

async function getJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

/** Resolves to `fallback` if `p` takes longer than `ms`. */
const within = <T, F>(p: Promise<T>, ms: number, fallback: F) =>
  Promise.race([p, new Promise<F>((r) => setTimeout(() => r(fallback), ms))]);

type Loaded = { d: Forecast; at: number };

export function WeatherApp() {
  const tolerance = useTolerance();
  const limits = useMemo(() => limitsFor(tolerance), [tolerance]);
  const [forecast, setForecast] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading…");
  const [notice, setNotice] = useState<FieldNotice | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [aqi, setAqi] = useState<number | null>(null);
  const [station, setStation] = useState<StationState>(undefined);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [moreConditions, setMoreConditions] = useState(false);
  const lastLoad = useRef(0);

  const load = useCallback(async () => {
    lastLoad.current = Date.now();
    setStatus("Updating…");
    const fc = getJSON<Forecast>(forecastUrl());
    const air = getJSON<{ current?: { us_aqi?: number } }>(airQualityUrl())
      .then((j) => (ok(j.current?.us_aqi) ? j.current.us_aqi : null))
      .catch(() => null);
    const fieldNotice = getJSON<{ notice: FieldNotice | null }>("/api/weather/notice", { cache: "no-store" })
      .then((j) => j.notice)
      .catch(() => undefined);
    fieldNotice.then((n) => n !== undefined && setNotice(n));
    air.then(setAqi);

    getJSON<{ features?: Alert[] }>(`https://api.weather.gov/alerts/active?point=${FIELD.lat},${FIELD.lon}`, {
      headers: { Accept: "application/geo+json" },
    })
      .then((j) => setAlerts(j.features || []))
      .catch(() => {});
    getJSON<StationData>("/api/weather/station")
      .then((data) => setStation({ data, at: Date.now() }))
      .catch(() => setStation((prev) => prev ?? { data: null, at: Date.now() }));

    // A "closed" notice and unhealthy air both change the verdict: give them a moment so it doesn't flip
    await within(Promise.all([fieldNotice, air]), 3000, null);
    try {
      const d = await fc;
      setForecast({ d, at: Date.now() });
      setError(null);
      // With no signal the installed app shows the last saved forecast: say so instead of "Updated <now>"
      const fieldNow = new Date().toLocaleString("sv-SE", { timeZone: FIELD.tz }).replace(" ", "T").slice(0, 16);
      const ageMin = (Date.parse(fieldNow) - Date.parse(d.current.time)) / 60000;
      setStatus(
        ageMin > 90
          ? `Offline · saved ${dayName(d.current.time.slice(0, 10), fieldNow.slice(0, 10))} ${clock(d.current.time)}`
          : "Updated " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("Update failed");
    }
  }, []);

  useEffect(() => {
    // Refresh every 10 minutes, and when the pilot comes back to the tab if the data is over 2 minutes old
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastLoad.current > 120_000) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useServiceWorker();

  // Everything rated for the pilot's aircraft
  const view = useMemo(() => {
    if (!forecast) return null;
    const { d, at } = forecast;
    const c = d.current;
    const { hours, idx, sun, now: nowHour } = currentHour(d, at);
    const rated: Rated[] = hours.map((h) => ({ ...h, a: assess(h, limits) }));
    const a = assess(nowHour, limits);
    // Unhealthy air (wildfire smoke, winter inversion) right now makes it a caution day
    if (aqi !== null && aqi > 150) {
      a.reasons.push({ l: 1, msg: `Unhealthy air (AQI ${Math.round(aqi)}): smoke or inversion haze` });
      a.lvl = Math.max(a.lvl, 1) as typeof a.lvl;
    }
    const now: Rated = { ...nowHour, a };
    // When it's dark: the next sunrise, for the verdict's night marker
    const sunrise = c.is_day ? null : (d.daily.sunrise.find((s) => s > c.time) ?? null);
    return { d, idx, sun, now, hours: rated, sunrise, todayStr: c.time.slice(0, 10), trend: windTrend(nowHour, hours, idx) };
  }, [forecast, limits, aqi]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <ToleranceSelect value={tolerance} />
        <div className="flex items-center gap-2">
          <span className="text-slate-500" aria-live="polite">
            {status}
          </span>
          <button type="button" onClick={load} className="btn-secondary" title="Refresh now" aria-label="Refresh">
            ⟳ Refresh
          </button>
        </div>
      </div>

      {notice && <NoticeBanner notice={notice} />}
      {alerts.map((a, i) => (
        <AlertBanner key={a.properties?.id ?? i} alert={a} />
      ))}

      {!view ? (
        <section className={`card p-5 ${error ? "bg-nogo-soft text-[#8f1f26]" : "text-slate-500"}`}>
          {error ? (
            <>
              Couldn&apos;t load the forecast ({error}). Check your connection.{" "}
              <button type="button" onClick={load} className="underline">
                Try again
              </button>
            </>
          ) : (
            <span className="animate-pulse">Fetching the latest weather for the field…</span>
          )}
        </section>
      ) : (
        <>
          <Verdict
            now={view.now}
            hours={view.hours}
            idx={view.idx}
            todayStr={view.todayStr}
            trend={view.trend}
            aqi={aqi}
            closed={!!notice?.closed}
            tolerance={tolerance}
            sunrise={view.sunrise}
          />
          <WindCard now={view.now} sun={view.sun} station={station} />
          <Conditions d={view.d} now={view.now} hours={view.hours} idx={view.idx} todayStr={view.todayStr} aqi={aqi} more={moreConditions} onToggleMore={() => setMoreConditions(!moreConditions)} />
          <Hourly now={view.now} hours={view.hours} idx={view.idx} todayStr={view.todayStr} sun={view.d.daily} />
          <Outlook
            d={view.d}
            hours={view.hours}
            idx={view.idx}
            todayStr={view.todayStr}
            openDay={openDay}
            onToggleDay={(date) => setOpenDay(openDay === date ? null : date)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Aloft now={view.now} h0={view.hours[view.idx]} />
            <Sources />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Installed-app support: a service worker keeps the last forecast for when there's no signal at the
 * field. It checks for a new version whenever the app comes back on screen, and reloads once when one
 * takes over (not on the very first install).
 */
function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const sw = navigator.serviceWorker;
    const hadController = !!sw.controller;
    let reg: ServiceWorkerRegistration | undefined;
    const onVisible = () => {
      if (!document.hidden) reg?.update().catch(() => {});
    };
    let reloaded = false;
    const onChange = () => {
      if (hadController && !reloaded) {
        reloaded = true;
        location.reload();
      }
    };
    sw.register("/weather-sw.js", { scope: "/weather" })
      .then((r) => {
        reg = r;
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {});
    sw.addEventListener("controllerchange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sw.removeEventListener("controllerchange", onChange);
    };
  }, []);
}
