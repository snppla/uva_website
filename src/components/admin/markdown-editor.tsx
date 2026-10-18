"use client";

import { useRef, useState, useTransition } from "react";
import { previewMarkdown, uploadInlineImage } from "@/app/admin/shared-actions";

/** Textarea for markdown with image upload and a preview tab. */
export function MarkdownEditor({
  name,
  label,
  defaultValue = "",
  rows = 16,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(text: string) {
    const el = textRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + text + value.slice(end));
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.set("image", file);
      const res = await uploadInlineImage(fd);
      if (res.url) insertAtCursor(`\n![${file.name.replace(/\.[^.]+$/, "")}](${res.url})\n`);
      else setError(res.error ?? "Upload failed.");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <div className="flex gap-1 text-sm">
          <button
            type="button"
            className="rounded px-2 py-1 text-brand-700 hover:bg-brand-50"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Insert image"}
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-brand-700 hover:bg-brand-50"
            onClick={async () => setPreview(preview === null ? await previewMarkdown(value) : null)}
          >
            {preview === null ? "Preview" : "Edit"}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {/* The textarea stays mounted (hidden in preview) so its value is submitted. */}
      <textarea
        ref={textRef}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`input font-mono ${preview !== null ? "hidden" : ""}`}
      />
      {preview !== null && (
        <div
          className="prose prose-slate max-w-none rounded-md border border-slate-200 bg-white p-4"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-slate-500">
        Formatting: <code>**bold**</code>, <code>*italic*</code>, <code>## Heading</code>, <code>- list item</code>,{" "}
        <code>[link text](https://…)</code>. Paste a YouTube embed link as{" "}
        <code>&lt;iframe src=&quot;https://www.youtube.com/embed/…&quot;&gt;&lt;/iframe&gt;</code>.
      </p>
    </div>
  );
}
