"use client";

import { useState, type CSSProperties } from "react";
import { FIELD, type Runway } from "@/lib/weather/field";
import { norm, ok, r0, rwyNum, toMag, type RunwayComponents } from "@/lib/weather/calc";

const C = 110; // center of the ring
const rad = (a: number) => (a * Math.PI) / 180;
/** Point at compass angle `a` (degrees, clockwise from up) and radius `r` from the center. */
const pt = (a: number, r: number): [number, number] => [C + r * Math.sin(rad(a)), C - r * Math.cos(rad(a))];

// Runways drawn to scale (longest = 104 px), crossing at the compass center like the real X.
const maxLen = Math.max(...FIELD.runways.map((r) => r.len));
const maxWid = Math.max(...FIELD.runways.map((r) => r.wid));
const pxPerFt = 104 / maxLen;
const ext = (r: Runway) => {
  const L = r.len * pxPerFt;
  return { fwd: (1 - r.back) * L, back: r.back * L };
};
const stripWidth = (r: Runway) => Math.max(10, (22 * r.wid) / maxWid);

// Pits marker, ~160 ft east of the intersection
const [px, py] = pt(FIELD.pits.bearing, FIELD.pits.distFt * pxPerFt);

// Pilot stations: white fence with 4 stations along the main runway's NE edge, NW of the intersection.
// In the main runway's rotated frame, +y points NW (hdg + 180) and -x points NE.
const mainRwy = FIELD.runways[0];
const fx = C - stripWidth(mainRwy) / 2 - 6;
const fy0 = C + 6;
const fLen = 24;
const stationsCenter: [number, number] = (() => {
  const ma = rad(mainRwy.hdg);
  const dx = fx + 1.75 - C, dy = fy0 + fLen / 2 - C;
  return [C + dx * Math.cos(ma) - dy * Math.sin(ma), C + dx * Math.sin(ma) + dy * Math.cos(ma)];
})();

const COLORS = { muted: "#5d6778", line: "#dfe5ee", navy: "#1b2130", go: "#1f8f4e", wind: "#1f7fb8", windFill: "#6cc4f5" };
const halo = (color: string): CSSProperties => ({ paintOrder: "stroke", stroke: color, strokeWidth: 3, strokeLinejoin: "round" });

type Props = {
  /** Wind direction, degrees true (where it blows from). */
  dirTrue: number | null;
  /** Favored runway end, or null when there's no wind data. */
  comp: RunwayComponents | null;
  windSpeed: number | null;
  /** Sun position now, degrees true / above the horizon. */
  sun: { az: number; el: number } | null;
};

/**
 * The field from above in the magnetic frame: satellite photo (or drawn runways if it fails to load),
 * wind arrow, LAND / TAKEOFF arrows on the favored runway, pits windsock, pilot stations and the sun.
 */
export function Compass({ dirTrue, comp, windSpeed, sun }: Props) {
  const P = FIELD.photo;
  const [photo, setPhoto] = useState(true);
  const favRwy = comp?.rwy;
  const dir = ok(dirTrue) ? toMag(dirTrue) : null;
  const labelStyle: CSSProperties = photo ? { fill: "#fff", ...halo("rgba(20,26,38,.75)") } : { fill: COLORS.muted };
  const k = pxPerFt / P.pxPerFt; // compass px per photo px

  return (
    <svg
      className="h-auto w-full max-w-[460px] flex-none"
      viewBox="-42 -22 304 264"
      role="img"
      aria-label={`Wind from ${r0(dir)} degrees magnetic. Runways ${FIELD.runways.map((r) => `${rwyNum(r.hdg)}/${rwyNum(r.hdg + 180)}`).join(" and ")}`}
    >
      <circle cx={C} cy={C} r={100} fill="#f4f8fd" stroke={COLORS.line} strokeWidth={2} />
      {photo && (
        <>
          <defs>
            <clipPath id="ringClip">
              <circle cx={C} cy={C} r={99} />
            </clipPath>
          </defs>
          {/* Rotated from true north into the compass's magnetic frame and clipped to the ring */}
          <g clipPath="url(#ringClip)">
            <circle cx={C} cy={C} r={100} fill={P.fill} />
            <image
              href={P.src}
              x={C - P.cx * k}
              y={C - P.cy * k}
              width={P.w * k}
              height={P.h * k}
              preserveAspectRatio="none"
              transform={`rotate(${-FIELD.magVar} ${C} ${C})`}
              onError={() => setPhoto(false)}
            />
          </g>
        </>
      )}
      <circle cx={C} cy={C} r={100} fill="none" stroke={COLORS.line} strokeWidth={2} />

      {/* Ticks every 30°, longer at the cardinal points */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = i * 30;
        const [x1, y1] = pt(a, 100);
        const [x2, y2] = pt(a, a % 90 ? 93 : 88);
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={photo ? "#fff" : "#b8c3d3"} strokeWidth={1.5} />;
      })}
      {["N", "E", "S", "W"].map((l, i) => {
        const [x, y] = pt(i * 90, 78);
        return (
          <text key={l} x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} style={labelStyle}>
            {l}
          </text>
        );
      })}

      {/* Pits and taxiway (drawn view only), with its label */}
      {!photo && (
        <g>
          <line x1={C} y1={C} x2={px} y2={py} stroke="#8b95a7" strokeWidth={4} />
          <rect x={px - 3} y={py - 12} width={10} height={24} rx={2} fill="#c8323a" stroke="#fff" />
        </g>
      )}
      <text x={px + 12} y={py + 4} fontSize={10} fontWeight={700} style={labelStyle}>
        Pits
      </text>

      {photo ? (
        favRwy && <FavOutline rwy={favRwy} />
      ) : (
        // Main drawn last so it sits on top
        [...FIELD.runways].reverse().map((r) => {
          const e = ext(r), w = stripWidth(r);
          return (
            <g key={r.name} transform={`rotate(${r.hdg} ${C} ${C})`}>
              <rect x={C - w / 2} y={C - e.fwd} width={w} height={e.fwd + e.back} rx={2} fill={r === favRwy ? "#3a4253" : "#8b95a7"} />
              <line x1={C} y1={C - e.fwd + 7} x2={C} y2={C + e.back - 7} stroke="#fff" strokeWidth={2} strokeDasharray="8 7" />
            </g>
          );
        })
      )}

      {/* Pilot stations */}
      <g transform={`rotate(${mainRwy.hdg} ${C} ${C})`}>
        <rect x={fx} y={fy0} width={3.5} height={fLen} fill="#fff" stroke="#7d8798" strokeWidth={0.8} />
        {[1, 2, 3].map((i) => (
          <line key={i} x1={fx - 1} x2={fx + 4.5} y1={fy0 + (i * fLen) / 4} y2={fy0 + (i * fLen) / 4} stroke="#e0a100" strokeWidth={1.2} />
        ))}
      </g>

      {photo && (
        <text x={C + 128} y={C + 128} textAnchor="end" fontSize={6.5} fill={COLORS.muted}>
          {P.credit}
        </text>
      )}

      {dir !== null && <WindArrow dir={dir} photo={photo} />}
      {comp && !(ok(windSpeed) && windSpeed <= FIELD.calmMph) && <Flow comp={comp} photo={photo} />}
      <RunwayNumbers />
      <Windsock dir={dir} windSpeed={windSpeed} />
      {sun && sun.el > 0 && <Sun az={sun.az} el={sun.el} />}
    </svg>
  );
}

/** Over the satellite photo, the favored runway is just outlined. */
function FavOutline({ rwy }: { rwy: Runway }) {
  const e = ext(rwy), w = stripWidth(rwy) + 3;
  return (
    <rect
      transform={`rotate(${rwy.hdg} ${C} ${C})`}
      x={C - w / 2}
      y={C - e.fwd - 1.5}
      width={w}
      height={e.fwd + e.back + 3}
      rx={3}
      fill="none"
      stroke="#fff"
      strokeWidth={1.6}
      strokeDasharray="5 3"
    />
  );
}

/** Light blue arrow from where the wind comes from, with "WIND DIRECTION" just outside the ring at its tail. */
function WindArrow({ dir, photo }: { dir: number; photo: boolean }) {
  // Above the tail on the top half of the ring, below it on the bottom half
  const [x, y] = pt(dir, 104);
  const y1 = Math.cos(rad(dir)) >= 0 ? y - 16 : y + 12;
  return (
    <>
      <g transform={`rotate(${dir} ${C} ${C})`}>
        <line
          x1={C} y1={8} x2={C} y2={C - 18}
          stroke={COLORS.windFill} strokeWidth={7} strokeLinecap="round"
          style={photo ? { filter: "drop-shadow(0 0 1.5px rgba(0,0,0,.6))" } : undefined}
        />
        <polygon points={`${C - 13},${C - 30} ${C + 13},${C - 30} ${C},${C - 4}`} fill={COLORS.windFill} stroke={COLORS.wind} strokeWidth={1} />
      </g>
      <text textAnchor="middle" fontSize={8} fontWeight={800} fill={COLORS.wind} letterSpacing={0.4} style={halo("#fff")}>
        <tspan x={x} y={y1}>WIND</tspan>
        <tspan x={x} y={y1 + 9}>DIRECTION</tspan>
      </text>
    </>
  );
}

/** Runway numbers at each end. The end lying in direction H is where you land heading H+180. */
function RunwayNumbers() {
  return FIELD.runways.map((r) => {
    const e = ext(r);
    return ([[r.hdg, e.fwd], [r.hdg + 180, e.back]] as const).map(([h, d]) => {
      const [x, y] = pt(h, d + 8);
      return (
        <g key={`${r.name}-${h}`}>
          <rect x={x - 7.5} y={y - 5.5} width={15} height={11} rx={2.5} fill="#fff" stroke={COLORS.line} />
          <text x={x} y={y + 2.6} textAnchor="middle" fontSize={7} fontWeight={700} fill={COLORS.navy}>
            {rwyNum(h + 180)}
          </text>
        </g>
      );
    });
  });
}

/** Windsock on the south end of the pits roof: points downwind, longer as the wind builds. */
function Windsock({ dir, windSpeed }: { dir: number | null; windSpeed: number | null }) {
  const sx = px + 2, sy = py + 12;
  const mast = <circle cx={sx} cy={sy} r={2.5} fill={COLORS.navy} />;
  if (dir === null || !ok(windSpeed) || windSpeed < 2) return mast;
  const f = Math.min(1, windSpeed / 17); // fully extended at ~15 kt (17 mph)
  const L = 6 + 18 * f, w0 = 4, w1 = 1.5 + 1.5 * f; // length, mouth half-width, tail half-width
  const band = (a: number, b: number) => {
    const wa = w0 + (w1 - w0) * a, wb = w0 + (w1 - w0) * b;
    return `${-wa},${-L * a} ${wa},${-L * a} ${wb},${-L * b} ${-wb},${-L * b}`;
  };
  return (
    <>
      <g transform={`translate(${sx} ${sy}) rotate(${dir + 180})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <polygon key={i} fill={i % 2 ? "#ffffff" : "#ff6a13"} points={band(i / 5, (i + 1) / 5)} />
        ))}
        <polygon fill="none" stroke="#9a3d00" strokeWidth={0.6} points={`${-w0},0 ${w0},0 ${w1},${-L} ${-w1},${-L}`} />
      </g>
      {mast}
    </>
  );
}

/** Where the sun is right now, on the ring in the magnetic frame. */
function Sun({ az, el }: { az: number; el: number }) {
  const [sx, sy] = pt(toMag(az), 100);
  return (
    <g>
      <title>{`Sun: ${r0(el)}° high`}</title>
      <circle cx={sx} cy={sy} r={8} fill="#f2c230" stroke="#c99a00" strokeWidth={1.5} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const kr = rad(a);
        return (
          <line key={a} x1={sx + 10 * Math.sin(kr)} y1={sy - 10 * Math.cos(kr)} x2={sx + 13 * Math.sin(kr)} y2={sy - 13 * Math.cos(kr)} stroke="#c99a00" strokeWidth={1.5} />
        );
      })}
    </g>
  );
}

/** Green LAND / TAKEOFF arrows beside the favored runway, pointing into the wind (comp.h). */
function Flow({ comp, photo }: { comp: RunwayComponents; photo: boolean }) {
  const r = comp.rwy, e = ext(r);
  const intoFwd = norm(comp.h) === norm(r.hdg);
  const up = intoFwd ? e.fwd : e.back, down = intoFwd ? e.back : e.fwd;
  const halfW = stripWidth(r) / 2;
  // Landing arrow starts out on the approach and the takeoff arrow ends on the climb-out,
  // both past the runway ends (capped inside the ring)
  const approach = Math.min(down + 45, 92), climb = Math.min(up + 45, 92);
  const land = [C + approach, C + 4], tko = [C - 6, C - climb];

  // Things the labels must not cover, [x, y, keep-out radius]: runway number boxes, the pits roof,
  // the windsock mast and the pilot stations
  const obstacles: [number, number, number][] = FIELD.runways
    .flatMap((rw): [number, number, number][] => {
      const ee = ext(rw);
      return [[...pt(rw.hdg, ee.fwd + 8), 12], [...pt(rw.hdg + 180, ee.back + 8), 12]];
    })
    .concat([[px + 2, py, 16], [px + 2, py + 12, 9], [...stationsCenter, 15]]);
  const a = rad(comp.h);
  const toScreen = (X: number, Y: number) => {
    const dx = X - C, dy = Y - C;
    return [C + dx * Math.cos(a) - dy * Math.sin(a), C + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  // How much of a label would be covered (0 = completely clear)
  const overlap = (lx: number, ly: number, hl: number) => {
    let n = 0;
    for (let t = -hl; t <= hl; t += 3) {
      const [sx, sy] = toScreen(lx, ly + t);
      if (obstacles.some(([ox, oy, rr]) => Math.hypot(sx - ox, sy - oy) < rr)) n++;
    }
    return n;
  };
  // Slide a label along its arrow, starting at the preferred spot; take the first clear spot,
  // or the least-covered one if nothing is completely clear
  const place = (lx: number, from: number, to: number, pref: number, hl: number) => {
    const lo = Math.min(from, to) + hl, hi = Math.max(from, to) - hl;
    const cands: number[] = [];
    for (let y = lo; y <= hi; y += 2) cands.push(y);
    cands.sort((p, q) => Math.abs(p - pref) - Math.abs(q - pref));
    let best: { y: number; pen: number } | null = null;
    for (const y of cands) {
      const pen = overlap(lx, y, hl);
      if (!best || pen < best.pen) best = { y, pen };
      if (pen === 0) break;
    }
    return best;
  };
  // Prefer the side away from the pits; each arrow switches sides on its own if its label won't fit
  const rightNormal = norm(comp.h + 90);
  const prefSide = Math.abs(((rightNormal - FIELD.pits.bearing + 540) % 360) - 180) < 90 ? -1 : 1;
  const fit = (from: number, to: number, prefY: number, hl: number) => {
    let best: { x: number; lx: number; y: number; pen: number } | null = null;
    for (const side of [prefSide, -prefSide]) {
      const x = C + side * (halfW + 7), lx = x + side * 9;
      const p = place(lx, from, to, prefY, hl);
      if (p && (!best || p.pen < best.pen)) best = { x, lx, y: p.y, pen: p.pen };
      if (best && best.pen === 0) break;
    }
    if (best) return best;
    const x = C + prefSide * (halfW + 7);
    return { x, lx: x + prefSide * 9, y: prefY };
  };
  const LA = fit(land[1] + 2, land[0], C + (approach + down) / 2, 13);
  const TA = fit(tko[1] + 8, tko[0], C - (climb + up) / 2, 22);

  const shadow: CSSProperties | undefined = photo ? { filter: "drop-shadow(0 0 1.2px #fff) drop-shadow(0 0 1px #fff)" } : undefined;
  const arrow = (x: number, y1: number, y2: number, dash: boolean) => (
    <>
      <line x1={x} y1={y1} x2={x} y2={y2 + 6} stroke={COLORS.go} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={dash ? "5 3" : undefined} style={shadow} />
      <polygon points={`${x - 5},${y2 + 8} ${x + 5},${y2 + 8} ${x},${y2}`} fill={COLORS.go} style={shadow} />
    </>
  );
  // Labels run along the arrows, just outside them; flipped when they'd read upside down
  const flip = norm(comp.h) > 180;
  const label = (p: { lx: number; y: number }, txt: string) => (
    <text
      x={p.lx} y={p.y} textAnchor="middle" dominantBaseline="middle"
      transform={`rotate(${flip ? 90 : -90} ${p.lx} ${p.y})`}
      fontSize={8.5} fontWeight={800} fill={COLORS.go} letterSpacing={0.4} style={halo("#fff")}
    >
      {txt}
    </text>
  );
  return (
    <g transform={`rotate(${comp.h} ${C} ${C})`}>
      {arrow(LA.x, land[0], land[1], true)}
      {arrow(TA.x, tko[0], tko[1], false)}
      {label(LA, "LAND")}
      {label(TA, "TAKEOFF")}
    </g>
  );
}
