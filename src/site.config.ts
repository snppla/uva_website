// Basic club identity. Page content (About, Membership info, etc.) is
// editable in the admin panel; these values change rarely and live in code.
export const site = {
  name: "Utah Valley Aeromodelers",
  // Public address, used for absolute links in link previews.
  url: "https://utahvalleyaeromodelers.com",
  shortName: "UVA",
  tagline: "Radio-control flying on the Jordan River in Saratoga Springs, Utah.",
  location: "Saratoga Springs, Utah",
  // For search results: says what the club is and where, in the words people search with.
  description:
    "Radio-control (RC) flying club and flying field in Saratoga Springs, Utah County. Planes, jets, helicopters and drones; pilots of every skill level welcome.",
  // All event times are entered and displayed in this time zone.
  timeZone: "America/Denver",
  sourceUrl: "https://github.com/snppla/uva_website",
  nav: [
    { href: "/about", label: "About" },
    { href: "/field", label: "Field" },
    { href: "/blog", label: "News" },
    { href: "/events", label: "Events" },
    { href: "/gallery", label: "Gallery" },
    { href: "/resources", label: "Resources" },
  ],
};
