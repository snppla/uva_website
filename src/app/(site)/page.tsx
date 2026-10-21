import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { site } from "@/site.config";
import { getPublishedPosts, getRecentPhotos, getSettings, getUpcomingEvents } from "@/lib/data";
import { Markdown } from "@/lib/markdown";
import { imageUrl } from "@/lib/urls";
import { ClubJsonLd } from "@/components/club-json-ld";
import { EventItem, PostCard } from "@/components/cards";
import { Mountains, PlaneIcon } from "@/components/brand";
import { Empty, Loading, SectionTitle } from "@/components/ui";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<Hero />}>
        <HeroWithPhoto />
      </Suspense>

      <div className="relative z-10 mx-auto -mt-6 grid max-w-6xl gap-4 px-4 sm:-mt-10 md:grid-cols-3">
        <Highlight title="The field" href="/field">
          A maintained runway and pit area on the Jordan River Parkway in Saratoga Springs, by the north shore of Utah Lake.
        </Highlight>
        <Highlight title="Every skill level" href="/membership">
          From first-time pilots to members with decades of experience. Come out to the field and ask about getting started.
        </Highlight>
        <Highlight title="Events all year" href="/events">
          Club meetings, fly-ins and our summer Fun Fly, a public tradition for more than 30 years.
        </Highlight>
      </div>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
        <Suspense fallback={<Loading />}>
          <Intro />
        </Suspense>
        <Suspense>
          <ClubJsonLd />
        </Suspense>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <SectionTitle title="Latest news" action={<ViewAll href="/blog" />} />
            <Suspense fallback={<Loading />}>
              <LatestPosts />
            </Suspense>
          </section>
          <section>
            <SectionTitle title="Coming up" action={<ViewAll href="/events" />} />
            <Suspense fallback={<Loading />}>
              <UpcomingEvents />
            </Suspense>
          </section>
        </div>

        <section>
          <SectionTitle title="From the field" action={<ViewAll href="/gallery" />} />
          <Suspense fallback={<Loading />}>
            <RecentPhotos />
          </Suspense>
        </section>
      </div>

      <section className="relative overflow-hidden bg-brand-900 text-white">
        <PlaneIcon className="absolute -top-6 right-6 h-48 w-48 rotate-[30deg] text-white/5" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="heading text-3xl sm:text-4xl">Ready to fly with us?</h2>
            <p className="mt-2 max-w-xl text-brand-100">
              Membership supports the field and the club, and gets you in on club events. Joining or renewing takes a minute with PayPal.
            </p>
          </div>
          <Link href="/membership" className="btn-accent heading shrink-0 px-6 py-3 text-lg">
            Join or renew
          </Link>
        </div>
      </section>
    </>
  );
}

async function HeroWithPhoto() {
  const { heroImage } = await getSettings();
  return <Hero photo={heroImage ? imageUrl(heroImage) : undefined} />;
}

function Hero({ photo }: { photo?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 text-white">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      ) : (
        // No banner photo yet: dusk sky gradient.
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_110%,var(--color-accent-500)_0%,transparent_45%),linear-gradient(to_bottom,var(--color-brand-950),var(--color-brand-800))]" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/90 via-brand-950/60 to-brand-950/10" />
      {!photo && <PlaneIcon className="absolute top-16 right-[8%] -z-10 hidden h-64 w-64 rotate-45 text-white/10 md:block" />}

      <div className="mx-auto max-w-6xl px-4 pt-20 pb-28 sm:pt-28 sm:pb-40">
        <p className="heading text-sm text-accent-400 sm:text-base">Radio-control flying club · {site.location}</p>
        <h1 className="heading mt-3 max-w-3xl text-5xl leading-[0.95] sm:text-7xl">{site.name}</h1>
        <p className="mt-5 max-w-xl text-lg text-brand-100 sm:text-xl">{site.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/membership" className="btn-accent heading px-6 py-3 text-lg">
            Join or renew
          </Link>
          <Link href="/events" className="btn heading border border-white/40 px-6 py-3 text-lg text-white hover:bg-white/10">
            Upcoming events
          </Link>
        </div>
      </div>
      <Mountains className="absolute bottom-0 h-10 w-full text-slate-50 sm:h-16" />
    </section>
  );
}

function Highlight({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <Link href={href} className="card group border-t-4 border-t-accent-500 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <h2 className="heading text-xl text-brand-950 group-hover:text-accent-600">{title}</h2>
      <p className="mt-1.5 text-slate-600">{children}</p>
    </Link>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="heading text-sm text-brand-700 hover:text-accent-600">
      View all →
    </Link>
  );
}

async function Intro() {
  const { homeIntro } = await getSettings();
  return <Markdown source={homeIntro} className="prose-lg mx-auto max-w-3xl text-center" />;
}

async function LatestPosts() {
  const posts = await getPublishedPosts(4);
  if (!posts.length) return <Empty>No news yet.</Empty>;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

async function UpcomingEvents() {
  const events = await getUpcomingEvents(5);
  if (!events.length) return <Empty>Nothing scheduled right now.</Empty>;
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <EventItem key={e.id} event={e} />
      ))}
    </div>
  );
}

async function RecentPhotos() {
  const photos = await getRecentPhotos(8);
  if (!photos.length) return <Empty>No photos yet.</Empty>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((p, i) => (
        <Link
          key={p.id}
          href={`/gallery/${p.albumSlug}`}
          className={`group aspect-square overflow-hidden rounded-lg bg-slate-200 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(p.key, i === 0 ? "full" : "thumb")}
            alt={p.caption}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      ))}
    </div>
  );
}
