import { getSettings } from "@/lib/data";
import { directionsUrl, parseFieldLocation } from "@/lib/field";
import { site } from "@/site.config";

/** Structured data for search engines: the club and where its flying field is. */
export async function ClubJsonLd() {
  const settings = await getSettings();
  const field = parseFieldLocation(settings.fieldAddress);
  const base = (process.env.SITE_URL || site.url).replace(/\/+$/, "");
  const address = field.city && {
    "@type": "PostalAddress",
    streetAddress: field.street,
    addressLocality: field.city,
    addressRegion: field.region,
    postalCode: field.postalCode,
    addressCountry: "US",
  };
  const geo = field.lat !== undefined && { "@type": "GeoCoordinates", latitude: field.lat, longitude: field.lng };
  const data = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    name: site.name,
    alternateName: site.shortName,
    description: site.description,
    url: base,
    logo: `${base}/icon.png`,
    image: `${base}/opengraph-image`,
    email: settings.contactEmail || undefined,
    sameAs: [settings.facebookUrl].filter(Boolean),
    address: address || undefined,
    geo: geo || undefined,
    location: {
      "@type": "Place",
      name: field.name ?? "Flying field",
      address: address || undefined,
      geo: geo || undefined,
      hasMap: directionsUrl(field),
    },
  };
  return (
    <script
      type="application/ld+json"
      // Escape "<" so admin-entered text can't close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
