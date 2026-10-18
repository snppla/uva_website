import Link from "next/link";
import { getAlbums } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { imageUrl } from "@/lib/urls";
import { AdminTitle, Field, TextArea } from "@/components/admin/fields";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { createAlbum } from "./actions";

export default async function GalleryAdmin() {
  await requireAdmin();
  const albums = await getAlbums();
  return (
    <>
      <AdminTitle title="Gallery" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {albums.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {albums.map((a) => (
                <Link key={a.id} href={`/admin/gallery/${a.id}`} className="card flex gap-3 p-3 hover:border-brand-300">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-slate-200">
                    {a.coverKey && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(a.coverKey, "thumb")} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <p className="text-sm text-slate-500">
                      {a.date && <>{formatDay(a.date)} · </>}
                      {a.photoCount} photos
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No albums yet. Create one to start uploading photos.</p>
          )}
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-3 font-semibold text-slate-900">New album</h2>
          <ActionForm action={createAlbum} className="space-y-4">
            <Field label="Title" name="title" placeholder="e.g. Spring Fun Fly 2026" required />
            <Field label="Date" name="date" type="date" hint="When the photos were taken." />
            <TextArea label="Description" name="description" rows={3} />
            <SubmitButton>Create album</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
