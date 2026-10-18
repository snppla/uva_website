"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { photosUploaded, uploadPhoto } from "@/app/admin/(panel)/gallery/actions";

/** Uploads photos one at a time so large batches don't hit request size limits. */
export function PhotoUploader({ albumId }: { albumId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const failed: string[] = [];
    setErrors([]);
    for (let i = 0; i < list.length; i++) {
      setProgress({ done: i, total: list.length });
      const fd = new FormData();
      fd.set("albumId", String(albumId));
      fd.set("photo", list[i]);
      try {
        const res = await uploadPhoto(fd);
        if (res.error) failed.push(res.error);
      } catch {
        failed.push(`${list[i].name}: upload failed (file may be too large).`);
      }
    }
    setProgress(null);
    setErrors(failed);
    if (input.current) input.current.value = "";
    await photosUploaded();
    router.refresh();
  }

  return (
    <div className="card border-2 border-dashed border-brand-200 p-6 text-center">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {progress ? (
        <div>
          <p className="text-sm font-medium text-slate-700">
            Uploading {progress.done + 1} of {progress.total}…
          </p>
          <div className="mx-auto mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="btn-primary" onClick={() => input.current?.click()}>
            Add photos
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Select one or many. Photos are resized automatically and location data is removed.
          </p>
        </>
      )}
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-left text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
