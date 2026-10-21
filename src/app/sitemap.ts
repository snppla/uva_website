import type { MetadataRoute } from "next";
import { getAlbums, getPublishedPosts } from "@/lib/data";
import { site } from "@/site.config";

// Lists the public pages for search engines. Built per request from the database.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || site.url).replace(/\/+$/, "");
  const [posts, albums] = await Promise.all([getPublishedPosts(1000), getAlbums()]);
  const pages = ["", "/field", "/about", "/events", "/membership", "/blog", "/gallery", "/resources"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, priority: p === "" || p === "/field" ? 1 : 0.7 })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.publishedAt ?? undefined, priority: 0.5 })),
    ...albums.filter((a) => a.photoCount > 0).map((a) => ({ url: `${base}/gallery/${a.slug}`, priority: 0.4 })),
  ];
}
