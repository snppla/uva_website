// Basic club identity. Page content (About, Membership info, etc.) is
// editable in the admin panel; these values change rarely and live in code.
export const site = {
  name: "Utah Valley Aeromodelers",
  // Public address, used for absolute links in link previews.
  url: "https://utahvalleyaeromodelers.com",
  shortName: "UVA",
  tagline: "Radio-control flying on the Jordan River in Saratoga Springs, Utah.",
  location: "Saratoga Springs, Utah",
  // Flying field on the Jordan River Parkway, used for the weather widget.
  field: {
    latitude: 40.363451694341514,
    longitude: -111.90165396732348,
    mapUrl: "https://maps.app.goo.gl/r7gpZ1Wo5seBGdM56",
  },
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
