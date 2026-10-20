// Editable site content, stored in the `settings` table. Anything not yet
// saved by an admin falls back to the default text here.
type SettingDef = {
  label: string;
  type: "markdown" | "text" | "textarea" | "url" | "image";
  hint?: string;
  default: string;
};

export const SETTINGS = {
  heroImage: {
    label: "Home page banner photo",
    type: "image",
    hint: "A wide landscape photo works best. Shown behind the club name at the top of the home page.",
    default: "",
  },
  homeIntro: {
    label: "Home page introduction",
    type: "markdown",
    default:
      "Utah Valley Aeromodelers is a radio-control flying club at the Jordan River Parkway field in Saratoga Springs. Whether you've never touched a transmitter or have been flying for decades, come out to the field and say hello. There's usually someone happy to show you around.",
  },
  about: {
    label: "About page",
    type: "markdown",
    default:
      "## Who we are\n\nUtah Valley Aeromodelers (UVA) has been flying radio-control aircraft in Utah Valley for more than 40 years. Our members range from young pilots just learning to fly to members with decades of building and flying experience, and we fly everything from trainers and park flyers to aerobatic planes, warbirds, jets and helicopters.\n\n## Our field\n\nWe fly at the RC airplane field on the Jordan River Parkway in Saratoga Springs, near the southern end of the trail by the north shore of Utah Lake. The field is managed by the City of Saratoga Springs. Field rules and safety requirements are posted at the field, and everyone who flies is expected to follow them.\n\n## The Fun Fly\n\nEach summer the club hosts its Fun Fly, a public event with stunt flying, jets, demonstrations, a raffle and food. It's been a club tradition for more than 30 years, and spectators are always welcome.\n\n## Officers\n\n- President: *Name*\n- Vice President: *Name*\n- Treasurer: *Name*\n- Safety Officer: *Name*",
  },
  membershipInfo: {
    label: "Membership page introduction",
    type: "markdown",
    default:
      "Club membership runs for the **calendar year** (January through December). Adult dues are **$75**.\n\nA current [Academy of Model Aeronautics (AMA)](https://www.modelaircraft.org/) membership is required to fly at the field, and club membership can't be approved without one.\n\nOnce your payment comes through, a club officer will email you club information, the field rules and the **gate access code**. Please take time to read them so we can keep the field safe and friendly.\n\n**Youth members** join free with an active AMA Youth membership. Email the treasurer at [treasurer.uva@gmail.com](mailto:treasurer.uva@gmail.com) with your first and last name, AMA number, email, phone and address.\n\n**Paying by check?** Email [treasurer.uva@gmail.com](mailto:treasurer.uva@gmail.com) with the same details and you'll be told where to send it.",
  },
  fieldAddress: {
    label: "Flying field location (shown in footer)",
    type: "textarea",
    default: "Jordan River Parkway RC Field\nSaratoga Springs, Utah",
  },
  contactEmail: {
    label: "Contact email (shown in footer)",
    type: "text",
    default: "",
  },
  facebookUrl: {
    label: "Facebook page",
    type: "url",
    default: "https://www.facebook.com/UVAeromodelers",
  },
  facebookGroupUrl: {
    label: "Members-only Facebook group",
    type: "url",
    default: "https://www.facebook.com/groups/UVAClubMembers",
  },
} satisfies Record<string, SettingDef>;

export type SettingKey = keyof typeof SETTINGS;
export type Settings = Record<SettingKey, string>;
