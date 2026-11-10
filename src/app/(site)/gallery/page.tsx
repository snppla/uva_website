import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAlbums } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { imageUrl } from "@/lib/urls";
import { Container, Empty, Loading, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos of RC planes, helicopters and club events at the Utah Valley Aeromodelers flying field in Saratoga Springs, Utah, going back to 2001.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Photo gallery" subtitle="Snapshots from the field, events and builds." />
      <Container>
        <Suspense fallback={<Loading />}>
          <AlbumGrid />
        </Suspense>
      </Container>
    </>
  );
}

async function AlbumGrid() {
  const albums = (await getAlbums()).filter((a) => a.photoCount > 0);
  if (!albums.length) return <Empty>No photo albums yet.</Empty>;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((a) => (
        <Link key={a.id} href={`/gallery/${a.slug}`} className="card group overflow-hidden transition hover:shadow-md">
          <div className="aspect-[4/3] bg-slate-200">
            {a.coverKey && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(a.coverKey, "thumb")} alt="" className="h-full w-full object-cover" loading="lazy" />
            )}
          </div>
          <div className="p-4">
            <h2 className="heading text-xl text-brand-950 group-hover:text-accent-600">{a.title}</h2>
            <p className="text-sm text-slate-500">
              {a.date && <>{formatDay(a.date)} · </>}
              {a.photoCount} photo{a.photoCount === 1 ? "" : "s"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
