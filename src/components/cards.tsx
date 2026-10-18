import Link from "next/link";
import type { Event } from "@/db/schema";
import { clubDate, formatEventWhen, formatShortDate } from "@/lib/dates";
import { imageUrl } from "@/lib/urls";

export function EventItem({ event }: { event: Event }) {
  const day = clubDate(event.startsAt);
  const [, m, d] = day.split("-").map(Number);
  const month = new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return (
    <Link href={`/events/${event.id}`} className="card flex gap-4 p-3.5 transition hover:border-accent-300 hover:shadow-md">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-brand-900 text-white">
        <span className="heading w-full bg-accent-500 py-0.5 text-center text-xs">{month}</span>
        <span className="font-display py-1 text-2xl font-bold leading-none">{d}</span>
      </div>
      <div className="min-w-0">
        <p className="heading text-lg leading-tight text-brand-950">{event.title}</p>
        <p className="text-sm text-slate-600">{formatEventWhen(event)}</p>
        {event.location && <p className="truncate text-sm text-slate-500">{event.location}</p>}
      </div>
    </Link>
  );
}

type PostSummary = {
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: Date | null;
  coverKey: string | null;
};

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} className="card group flex flex-col overflow-hidden transition hover:shadow-md">
      <div className="aspect-[16/9] overflow-hidden bg-brand-100">
        {post.coverKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(post.coverKey, "thumb")} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-300">
            <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {post.publishedAt && <p className="text-xs text-slate-500">{formatShortDate(post.publishedAt)}</p>}
        <h3 className="heading mt-1 text-xl leading-tight text-brand-950 group-hover:text-accent-600">{post.title}</h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.excerpt}</p>}
      </div>
    </Link>
  );
}
