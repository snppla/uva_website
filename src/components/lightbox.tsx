"use client";

import { useCallback, useEffect, useState } from "react";

type Photo = { id: number; thumb: string; full: string; caption: string };

export function Lightbox({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, step]);

  const current = index === null ? null : photos[index];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            className="aspect-square overflow-hidden rounded-lg bg-slate-200 focus:ring-4 focus:ring-brand-300 focus:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.caption} className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
          </button>
        ))}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.full}
            alt={current.caption}
            className="max-h-[85vh] max-w-full rounded object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-3 text-center text-sm text-slate-200">
            {current.caption} <span className="text-slate-400">({index! + 1} / {photos.length})</span>
          </p>
          <button onClick={close} className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1 text-2xl text-white hover:bg-white/20" aria-label="Close">
            ×
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); step(1); }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20"
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
