import { site } from "@/site.config";

export function imageUrl(key: string, size: "full" | "thumb" = "full") {
  return `/uploads/images/${key}${size === "thumb" ? "_thumb" : ""}.webp`;
}

/**
 * The site's public address, without a trailing slash. Use this, not the request's Host
 * header, for links in emails: the header can be forged to point a link elsewhere.
 */
export function siteUrl() {
  return (process.env.SITE_URL || site.url).replace(/\/+$/, "");
}
