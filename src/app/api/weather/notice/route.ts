import { getSettings } from "@/lib/data";
import { parseNotice } from "@/lib/weather/notice";

// The field notice banner for the Weather page (Admin → Page content → Field notice).
// The page polls this so an open or installed copy picks up a closure without a reload.
export async function GET() {
  const { fieldNotice } = await getSettings();
  return Response.json({ notice: parseNotice(fieldNotice) }, { headers: { "Cache-Control": "no-store" } });
}
