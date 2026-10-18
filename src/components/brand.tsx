import { site } from "@/site.config";

export function PlaneIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

/** The club's round UVA logo badge. */
export function Badge({ className = "h-10 w-10" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="" width={256} height={256} className={`shrink-0 rounded-full object-cover ring-2 ring-white/20 ${className}`} />
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Badge className={compact ? "h-9 w-9" : "h-11 w-11"} />
      <span className="leading-none">
        <span className="heading block text-lg sm:text-xl">{site.name}</span>
        {!compact && <span className="mt-0.5 block text-xs font-medium tracking-wide text-brand-200">{site.location}</span>}
      </span>
    </span>
  );
}

/** Mountain ridge silhouette, used at the bottom of dark banners. */
export function Mountains({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
      <path
        fill="currentColor"
        d="M0 120V78l70-22 60 14 90-46 70 30 64-18 96 40 84-52 72 34 88-56 80 44 70-20 96 38 82-50 74 30 90-28 74 22 86-36 94 24v94z"
      />
    </svg>
  );
}

export function FacebookIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}
