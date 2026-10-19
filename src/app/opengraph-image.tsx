import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/site.config";

export const alt = site.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The link-preview image shown when the site is shared in chats and social posts.
export default async function Image() {
  const logo = await readFile(path.join(process.cwd(), "public/logo.svg"), "base64");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 96px",
          background: "linear-gradient(135deg, #172b4d 0%, #264f8f 100%)",
          color: "white",
        }}
      >
        <img src={`data:image/svg+xml;base64,${logo}`} width={300} height={300} alt="" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{site.name}</div>
          <div style={{ marginTop: 28, fontSize: 34, lineHeight: 1.3, color: "#b6cdea" }}>{site.tagline}</div>
        </div>
      </div>
    ),
    size,
  );
}
