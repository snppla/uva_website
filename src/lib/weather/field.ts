// Field facts and aircraft wind limits for the Weather page. Ported from the club's
// original UVA Flight Weather app; measurements come from club members and Google Earth.

export type Runway = {
  name: string;
  /** Magnetic heading of one end. */
  hdg: number;
  /** True heading, as measured in Google Earth. */
  trueHdg: number;
  /** Length and width, ft. */
  len: number;
  wid: number;
  /** Share of the runway's length on the (hdg + 180) side of where the two runways cross. */
  back: number;
};

export const FIELD = {
  name: "UVA Field",
  lat: 40.363372,
  lon: -111.901728,
  tz: "America/Denver",
  // Magnetic variation at Saratoga Springs is about 10.5° E. Forecast wind direction is TRUE.
  magVar: 10.5,
  // Headings measured in Google Earth (true) and converted to magnetic: true - 10.5°.
  // The X sits about 2/3 of the way down the main runway from its NW end.
  runways: [
    { name: "Main", hdg: 136, trueHdg: 146.55, len: 553, wid: 50, back: 0.68 }, // 14/32
    { name: "Cross", hdg: 176, trueHdg: 186.54, len: 354, wid: 30, back: 0.55 }, // 18/36
  ] as Runway[],
  // Pits/pavilion: ~160 ft east of the runway intersection, joined by a taxiway
  pits: { bearing: 90 - 10.5, distFt: 160 },
  // Only recommend the shorter cross runway when it cuts the crosswind by at least this much (mph)
  crossRunwayMargin: 3,
  calmMph: 3, // at or below this, takeoff/landing direction doesn't matter
  elevFt: 4498, // field elevation (club figure); used for density altitude
  lowCloudFt: 700, // a cloud base below this (ft AGL) can hide a model in a normal pattern
  // Four pilot stations behind a white fence on the NE edge of the main runway, just NW of the
  // runway intersection. Pilots face SW, straight across the main runway (146.55° + 90° true).
  pilotFacingTrue: 236.5,
  // Glare when the sun is this low and this close to where pilots are looking
  glare: { maxElev: 30, halfAngle: 50, maxCloud: 80 },
  // Nearby live weather station (CWOP), read through /api/weather/station.
  station: { call: "EW9528", where: "1.4 mi WNW", staleMin: 30 },
  coldPackF: 50, // cold-battery tip at or below this temperature
  trendHours: 4, // how far ahead the wind trend looks
  // Satellite photo behind the compass (Google Earth, north up). cx/cy = pixel where the runways
  // cross; pxPerFt measured from the runway lengths.
  photo: {
    src: "/weather/field-photo.jpg",
    w: 600,
    h: 600,
    cx: 299.8,
    cy: 299.1,
    pxPerFt: 0.5493,
    fill: "#8f9a7c",
    credit: "Imagery © Google",
  },
};

/** [good up to, caution up to] in mph. Above the caution limit = no-go. */
export type Limits = [number, number];

/** How much wind the pilot is comfortable flying in. */
export type Tolerance = { wind: Limits; gust: Limits; xwind: Limits };

export const PRESETS = {
  low: { label: "Low", hint: "light breezes only", wind: [6, 10], gust: [10, 15], xwind: [4, 7] },
  medium: { label: "Medium", hint: "typical club flying", wind: [10, 15], gust: [15, 22], xwind: [7, 11] },
  high: { label: "High", hint: "comfortable in strong wind", wind: [14, 20], gust: [20, 28], xwind: [10, 15] },
} satisfies Record<string, Tolerance & { label: string; hint: string }>;

export type ToleranceLevel = keyof typeof PRESETS | "custom";

/** Custom limits: the most wind, gust and crosswind (mph) that still feel good. */
export type CustomLimits = { wind: number; gust: number; xwind: number };

export type ToleranceSetting = { level: ToleranceLevel; custom: CustomLimits };

export const DEFAULT_TOLERANCE: ToleranceSetting = { level: "medium", custom: { wind: 10, gust: 15, xwind: 7 } };

/** Custom caution limits sit this far above the "good" limits, about the same as the presets. */
const CUSTOM_CAUTION = 1.5;

export function limitsFor(s: ToleranceSetting): Tolerance {
  if (s.level !== "custom") return PRESETS[s.level];
  const pair = (v: number): Limits => [v, Math.round(v * CUSTOM_CAUTION)];
  return { wind: pair(s.custom.wind), gust: pair(s.custom.gust), xwind: pair(s.custom.xwind) };
}
