import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, albums, images } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/urls";
import { AdminTitle, Field, TextArea } from "@/components/admin/fields";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/admin/forms";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { deleteAlbum, deletePhoto, updateAlbum, updateCaption } from "../actions";

export default async function AlbumAdmin({ params }: PageProps<"/admin/gallery/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const [album] = Number.isInteger(id) ? await db.select().from(albums).where(eq(albums.id, id)) : [];
  if (!album) notFound();
  const photos = await db.select().from(images).where(eq(images.albumId, id)).orderBy(asc(images.createdAt));

  return (
    <>
      <AdminTitle title={album.title}>
        <Link href={`/gallery/${album.slug}`} className="btn-secondary" target="_blank">View</Link>
        <ConfirmButton action={deleteAlbum} fields={{ id }} confirm={`Delete this album and all ${photos.length} photos in it?`}>
          Delete album
        </ConfirmButton>
      </AdminTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <ActionForm action={updateAlbum} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <Field label="Title" name="title" defaultValue={album.title} required />
            <Field label="Date" name="date" type="date" defaultValue={album.date ?? undefined} hint="When the photos were taken." />
            <TextArea label="Description" name="description" rows={3} defaultValue={album.description} />
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
        </div>
        <div className="lg:col-span-2">
          <PhotoUploader albumId={id} />
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-semibold text-slate-700">
        Photos ({photos.length}) <span className="text-sm font-normal text-slate-500">— the first photo is the album cover</span>
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(p.key, "thumb")} alt={p.caption} className="aspect-square w-full object-cover" loading="lazy" />
            <div className="space-y-2 p-2">
              <form action={updateCaption} className="flex gap-1">
                <input type="hidden" name="id" value={p.id} />
                <input name="caption" defaultValue={p.caption} placeholder="Caption" className="input py-1 text-xs" />
                <button className="rounded px-2 text-xs font-medium text-brand-700 hover:bg-brand-50">Save</button>
              </form>
              <ConfirmButton
                action={deletePhoto}
                fields={{ id: p.id }}
                confirm="Delete this photo?"
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </ConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
