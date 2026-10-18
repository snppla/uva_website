import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAlbumBySlug } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { imageUrl } from "@/lib/urls";
import { Lightbox } from "@/components/lightbox";
import { Container, Empty, Loading } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/gallery/[slug]">) {
  const data = await getAlbumBySlug((await params).slug);
  return { title: data?.album.title ?? "Album not found" };
}

export default function AlbumPage({ params }: PageProps<"/gallery/[slug]">) {
  return (
    <Container>
      <Link href="/gallery" className="text-sm font-medium text-brand-700 hover:underline">
        ← All albums
      </Link>
      <Suspense fallback={<Loading />}>
        <Album params={params} />
      </Suspense>
    </Container>
  );
}

async function Album({ params }: Pick<PageProps<"/gallery/[slug]">, "params">) {
  const data = await getAlbumBySlug((await params).slug);
  if (!data) notFound();
  const { album, photos } = data;
  return (
    <>
      <h1 className="heading mt-4 text-4xl text-brand-950">{album.title}</h1>
      {album.date && <p className="mt-1 text-slate-500">{formatDay(album.date)}</p>}
      {album.description && <p className="mt-2 max-w-3xl text-slate-600">{album.description}</p>}
      <div className="mt-8">
        {photos.length ? (
          <Lightbox
            photos={photos.map((p) => ({
              id: p.id,
              thumb: imageUrl(p.key, "thumb"),
              full: imageUrl(p.key),
              caption: p.caption,
            }))}
          />
        ) : (
          <Empty>This album is empty.</Empty>
        )}
      </div>
    </>
  );
}
