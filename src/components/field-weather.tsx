import Link from "next/link";
import { getSettings } from "@/lib/data";
import { cardinal, r0, wx } from "@/lib/weather/calc";
import { getFieldNow, type FieldNow } from "@/lib/weather/now";
import { parseNotice } from "@/lib/weather/notice";

// Full class names so Tailwind finds them; same colors as the Weather page's verdict.
const VERDICT = [
  { label: "Good flying", className: "bg-go-soft text-go" },
  { label: "Flyable with caution", className: "bg-caution-soft text-caution" },
  { label: "Not recommended", className: "bg-nogo-soft text-nogo" },
];
const CLOSED = { label: "Field closed", className: "bg-nogo-soft text-nogo" };

/** Homepage card: current conditions and verdict at the field, linking to the full Weather page. */
export async function FieldWeather() {
  const [{ fieldNotice }, weather] = await Promise.all([
    getSettings(),
    getFieldNow().catch((): FieldNow | null => null),
  ]);
  const closed = !!parseNotice(fieldNotice)?.closed;

  if (!weather) {
    return (
      <Link href="/weather" className="card block p-5 text-sm text-slate-500 hover:shadow-md">
        Weather at the field is unavailable right now. <span className="text-brand-700">Try the Weather page →</span>
      </Link>
    );
  }

  const { now, a } = weather;
  const sky = wx(now.code, now.isDay);
  const verdict = closed ? CLOSED : VERDICT[a.lvl];
  const reasons = a.reasons.filter((r) => r.l !== "g").map((r) => r.msg);

  return (
    <Link href="/weather" className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-end justify-between gap-3">
        <p className="heading text-5xl leading-none text-brand-950">{r0(now.temp)}°</p>
        <p className="heading text-right text-lg text-brand-800">
          <span aria-hidden>{sky.icon}</span> {sky.text}
        </p>
      </div>
      <p className="mt-4 text-slate-600">
        {now.wind !== null && now.wind < 2
          ? "Calm"
          : `Wind ${r0(now.wind)} mph from the ${cardinal(now.dir)}, gusting ${r0(now.gust)}`}
      </p>
      <p className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${verdict.className}`}>{verdict.label}</p>
      {!closed && reasons.length > 0 && <p className="mt-2 text-sm text-slate-500">{reasons.join(" · ")}</p>}
      <p className="heading mt-4 text-sm text-brand-700 group-hover:text-accent-600">Full forecast →</p>
    </Link>
  );
}
