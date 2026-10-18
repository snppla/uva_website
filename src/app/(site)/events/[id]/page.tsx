import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEvent } from "@/lib/data";
import { formatEventWhen } from "@/lib/dates";
import { Markdown } from "@/lib/markdown";
import { Loading } from "@/components/ui";

async function load(params: PageProps<"/events/[id]">["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) ? getEvent(id) : null;
}

export async function generateMetadata({ params }: PageProps<"/events/[id]">) {
  const event = await load(params);
  return { title: event?.title ?? "Event not found" };
}

export default function EventPage({ params }: PageProps<"/events/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/events" className="text-sm font-medium text-brand-700 hover:underline">
        ← Events calendar
      </Link>
      <Suspense fallback={<Loading />}>
        <EventContent params={params} />
      </Suspense>
    </div>
  );
}

async function EventContent({ params }: Pick<PageProps<"/events/[id]">, "params">) {
  const event = await load(params);
  if (!event) notFound();
  const mapUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : null;
  return (
    <>
      <h1 className="heading mt-4 text-4xl text-brand-950">{event.title}</h1>
      <dl className="card mt-6 space-y-3 p-5">
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">When</dt>
          <dd className="text-slate-900">{formatEventWhen(event)}</dd>
        </div>
        {event.location && (
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Where</dt>
            <dd className="text-slate-900">
              {event.location}{" "}
              <a href={mapUrl!} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-700 hover:underline">
                (map)
              </a>
            </dd>
          </div>
        )}
      </dl>
      {event.description && <Markdown source={event.description} className="mt-8" />}
    </>
  );
}
