import Link from "next/link";
import { getSettings } from "@/lib/data";
import { site } from "@/site.config";
import { FacebookIcon, Logo } from "./brand";

export async function SiteFooter() {
  const settings = await getSettings();
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2">
        <div className="text-white">
          <Logo />
        </div>
        <p className="mt-4 max-w-sm text-brand-200">{site.tagline}</p>
      </div>
      <div>
        <h2 className="heading text-base text-white">Visit</h2>
        {settings.fieldAddress && <p className="mt-2 whitespace-pre-line text-brand-200">{settings.fieldAddress}</p>}
        {settings.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} className="mt-2 block text-brand-200 hover:text-white">
            {settings.contactEmail}
          </a>
        )}
        <Link href="/events/calendar.ics" className="mt-2 block text-brand-200 hover:text-white">
          Subscribe to the club calendar
        </Link>
      </div>
      <div>
        <h2 className="heading text-base text-white">Connect</h2>
        <ul className="mt-2 space-y-2">
          {settings.facebookUrl && (
            <li>
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-200 hover:text-white">
                <FacebookIcon /> Facebook page
              </a>
            </li>
          )}
          {settings.facebookGroupUrl && (
            <li>
              <a href={settings.facebookGroupUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-200 hover:text-white">
                <FacebookIcon /> Members&apos; group
              </a>
            </li>
          )}
          <li>
            <Link href="/membership" className="text-brand-200 hover:text-white">
              Join or renew
            </Link>
          </li>
          <li>
            <a href={site.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-white">
              Website source on GitHub
            </a>
          </li>
          <li>
            <Link href="/admin" className="text-brand-300 hover:text-white">
              Officer login
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
