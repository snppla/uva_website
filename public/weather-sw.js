// Service worker for the Weather page (/weather). Lets phones install it as an app and shows the
// last forecast when there's no signal at the field. Network first for everything, so pilots always
// get fresh data when they're online; the saved copy is only used when the network fails.
const CACHE = "uva-flight-wx-v1";
const MAX_ENTRIES = 150;
const SHELL = ["/weather", "/weather/field-photo.jpg", "/logo.svg", "/weather/manifest.webmanifest", "/weather/icon-192.png"];
// Weather services the page reads from the browser; their last answers are kept for offline use
const DATA_HOSTS = ["api.open-meteo.com", "air-quality-api.open-meteo.com", "api.weather.gov"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "no-cache" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function shouldCache(url) {
  if (url.origin === self.location.origin) {
    return url.pathname === "/weather" || url.pathname.startsWith("/weather/") || url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/api/weather/") || url.pathname === "/logo.svg";
  }
  return DATA_HOSTS.includes(url.hostname);
}

async function remember(req, res) {
  const cache = await caches.open(CACHE);
  await cache.put(req, res);
  // Drop the oldest entries (old builds' scripts) once the cache gets big
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(k);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const navigate = req.mode === "navigate";
  if (!navigate && !shouldCache(url)) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) e.waitUntil(remember(req, res.clone()));
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: navigate });
        if (hit) return hit;
        if (navigate) return (await caches.match("/weather")) || Response.error();
        return Response.error();
      }),
  );
});
