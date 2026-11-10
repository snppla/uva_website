import { connection } from "next/server";
import { FIELD } from "@/lib/weather/field";
import { getStation } from "@/lib/weather/station";

// Live readings from the nearby weather station, for the Weather page.
export async function GET() {
  await connection();
  try {
    const data = await getStation(FIELD.station.call);
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=120" } });
  } catch (e) {
    return Response.json({ call: FIELD.station.call, error: e instanceof Error ? e.message : String(e), reports: [] }, { status: 502 });
  }
}
