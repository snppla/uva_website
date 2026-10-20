import "server-only";
import { cacheLife } from "next/cache";
import { site } from "@/site.config";

export type FieldConditions = {
  temperature: number;
  sky: string;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  windCompass: string;
};

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

// Open-Meteo uses WMO weather interpretation codes.
const SKY: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

export async function getFieldWeather(): Promise<FieldConditions> {
  "use cache";
  cacheLife({ stale: 60 * 5, revalidate: 60 * 15, expire: 60 * 60 });

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(site.field.latitude));
  url.searchParams.set("longitude", String(site.field.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", site.timeZone);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);

  const data: { current?: Record<string, unknown> } = await res.json();
  const current = data.current;
  const temperature = current?.temperature_2m;
  const code = current?.weather_code;
  const windSpeed = current?.wind_speed_10m;
  const windGusts = current?.wind_gusts_10m;
  const windDirection = current?.wind_direction_10m;
  if (
    typeof temperature !== "number" ||
    typeof code !== "number" ||
    typeof windSpeed !== "number" ||
    typeof windGusts !== "number" ||
    typeof windDirection !== "number"
  ) {
    throw new Error("Weather response was incomplete");
  }

  return {
    temperature: Math.round(temperature),
    sky: SKY[code] ?? "Current conditions",
    windSpeed: Math.round(windSpeed),
    windGusts: Math.round(windGusts),
    windDirection,
    windCompass: COMPASS[((Math.round(windDirection / 45) % 8) + 8) % 8] ?? "N",
  };
}
