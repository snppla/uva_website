// Basic club identity. Page content (About, Membership info, etc.) is
// editable in the admin panel; these values change rarely and live in code.
export const site = {
  name: "Utah Valley Aeromodelers",
  shortName: "UVA",
  tagline: "Radio-control flying on the Jordan River Parkway in Saratoga Springs, Utah.",
  location: "Saratoga Springs, Utah",
  // All event times are entered and displayed in this time zone.
  timeZone: "America/Denver",
  sourceUrl: "https://github.com/snppla/uva_website",
  nav: [
    { href: "/about", label: "About" },
    { href: "/blog", label: "News" },
    { href: "/events", label: "Events" },
    { href: "/gallery", label: "Gallery" },
    { href: "/resources", label: "Resources" },
  ],
};
