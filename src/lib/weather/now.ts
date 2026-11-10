import "server-only";
import { cacheLife } from "next/cache";
import { assess, currentHour, forecastUrl, type Assessment, type Forecast, type Hour } from "./calc";
import { DEFAULT_TOLERANCE, limitsFor } from "./field";

export type FieldNow = { now: Hour; a: Assessment };

/**
 * Conditions at the field right now, rated like the Weather page does for its default
 * (medium) wind tolerance. Cached on the server so the homepage doesn't call Open-Meteo per visit.
 */
export async function getFieldNow(): Promise<FieldNow> {
  "use cache";
  cacheLife({ stale: 60 * 5, revalidate: 60 * 15, expire: 60 * 60 });

  const res = await fetch(forecastUrl());
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
  const d: Forecast = await res.json();
  const { now } = currentHour(d);
  return { now, a: assess(now, limitsFor(DEFAULT_TOLERANCE)) };
}
