import { getFieldWeather, type FieldConditions } from "@/lib/weather";

export async function FieldWeather() {
  let weather: FieldConditions;
  try {
    weather = await getFieldWeather();
  } catch {
    return <p className="text-sm text-slate-500">Weather at the field is unavailable right now.</p>;
  }

  return (
    <div className="card p-5">
      <div className="flex items-end justify-between gap-3">
        <p className="heading text-5xl leading-none text-brand-950">{weather.temperature}°</p>
        <p className="heading text-right text-lg text-brand-800">{weather.sky}</p>
      </div>
      <p className="mt-4 flex items-start gap-2 text-slate-600">
        <WindArrow degrees={weather.windDirection} />
        <span>
          {weather.windSpeed} mph from the {weather.windCompass}, gusting {weather.windGusts}
        </span>
      </p>
      <p className="mt-3 text-xs text-slate-400">
        <a href="https://open-meteo.com/" className="underline-offset-2 hover:text-slate-600 hover:underline" rel="noreferrer" target="_blank">
          Open-Meteo
        </a>
      </p>
    </div>
  );
}

function WindArrow({ degrees }: { degrees: number }) {
  return (
    <svg
      aria-hidden
      className="mt-0.5 shrink-0 text-brand-700"
      height="18"
      style={{ transform: `rotate(${degrees}deg)` }}
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M12 3v18M12 3l-5 6M12 3l5 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
