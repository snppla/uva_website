import type { Metadata, Viewport } from "next";
import { PageHeader, Container } from "@/components/ui";
import { FIELD } from "@/lib/weather/field";
import { WeatherApp } from "./weather-app";

export const metadata: Metadata = {
  title: "Flight Weather",
  description:
    "Flying weather for UVA Field, Saratoga Springs, Utah: wind, gusts, crosswind, wind aloft and a go/no-go outlook for RC pilots.",
  // Installable as a phone app ("Add to Home Screen") that opens on this page
  manifest: "/weather/manifest.webmanifest",
  appleWebApp: { capable: true, title: "UVA Weather" },
  icons: { apple: "/weather/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0e1a31" };

export default function WeatherPage() {
  return (
    <>
      <PageHeader
        title="Flight weather"
        subtitle={`UVA Field (Jordan River Model Port) · Saratoga Springs, Utah · elev. ${FIELD.elevFt.toLocaleString("en-US")} ft`}
      />
      <Container className="pt-6">
        <WeatherApp />
        <footer className="mt-8 space-y-2 text-sm text-slate-500">
          <p>
            <strong>For planning only.</strong> Except for the nearby station reading, everything here is a computer forecast for the field, not a
            measurement, and it can be wrong. Check the windsock and the conditions at the field before you fly. Ratings use the wind tolerance
            you pick.
          </p>
          <p>
            Data:{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
              Open-Meteo
            </a>{" "}
            forecast and air quality (CC BY 4.0),{" "}
            <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
              National Weather Service
            </a>{" "}
            alerts, station {FIELD.station.call} via{" "}
            <a href="http://www.findu.com/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
              findu.com
            </a>{" "}
            (CWOP). Refreshes every 10 minutes. Field imagery: Google Earth.
          </p>
          <p>
            <strong>Use it like an app:</strong> on iPhone, open this page in Safari, tap Share, then Add to Home Screen. On Android, open it in Chrome,
            tap ⋮, then Install app.
          </p>
        </footer>
      </Container>
    </>
  );
}
