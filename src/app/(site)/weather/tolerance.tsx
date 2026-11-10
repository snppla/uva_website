"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_TOLERANCE, PRESETS, type CustomLimits, type ToleranceLevel, type ToleranceSetting } from "@/lib/weather/field";

/* ---------- Saved in this browser (localStorage) ---------- */

const KEY = "uva-flight-wx-tolerance";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached = DEFAULT_TOLERANCE;

const LEVELS: ToleranceLevel[] = ["low", "medium", "high", "custom"];
const MAX_MPH = 60;
const clampMph = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_MPH) : fallback;
};

function parse(raw: string | null): ToleranceSetting {
  try {
    const s = JSON.parse(raw || "null");
    if (!s || typeof s !== "object") return DEFAULT_TOLERANCE;
    const d = DEFAULT_TOLERANCE.custom;
    return {
      level: LEVELS.includes(s.level) ? s.level : DEFAULT_TOLERANCE.level,
      custom: {
        wind: clampMph(s.custom?.wind, d.wind),
        gust: clampMph(s.custom?.gust, d.gust),
        xwind: clampMph(s.custom?.xwind, d.xwind),
      },
    };
  } catch {
    return DEFAULT_TOLERANCE;
  }
}

function read(): ToleranceSetting {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  // Same object while the stored value is unchanged, so React doesn't re-render needlessly
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function save(s: ToleranceSetting) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  cachedRaw = undefined;
  cached = s;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** The pilot's wind tolerance: a preset level or their own limits. */
export function useTolerance() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_TOLERANCE);
}

/* ---------- Controls ---------- */

const FIELDS: [keyof CustomLimits, string][] = [
  ["wind", "Wind"],
  ["gust", "Gusts"],
  ["xwind", "Crosswind"],
];

export function ToleranceSelect({ value }: { value: ToleranceSetting }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label className="flex items-center gap-2">
        <span className="font-medium text-slate-700">Wind tolerance</span>
        <select
          className="input w-auto py-1.5"
          value={value.level}
          onChange={(e) => save({ ...value, level: e.target.value as ToleranceLevel })}
        >
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
            <option key={k} value={k}>
              {PRESETS[k].label}: {PRESETS[k].hint}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </label>
      {value.level === "custom" && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-slate-500">Good up to</span>
          {FIELDS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-1.5">
              <span className="text-slate-700">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_MPH}
                // Uncontrolled so the box can be cleared while typing; saved once it holds a valid number
                defaultValue={value.custom[k]}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  if (e.target.value !== "" && n >= 1 && n <= MAX_MPH) save({ ...value, custom: { ...value.custom, [k]: n } });
                }}
                className="input w-16 py-1.5"
                aria-label={`${label}, mph`}
              />
              <span className="text-slate-500">mph</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
