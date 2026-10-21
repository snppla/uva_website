import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { site } from "@/site.config";
import "./globals.css";

const body = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  // SITE_URL lets each deployment (live or test) point link previews at itself.
  metadataBase: new URL(process.env.SITE_URL || site.url),
  title: { default: `${site.name} – RC Club & Flying Field in Utah County`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { type: "website", url: "./", siteName: site.name, description: site.description, locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
