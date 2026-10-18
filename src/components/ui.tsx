import type { ReactNode } from "react";
import { Mountains } from "./brand";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-brand-950 to-brand-800 text-white">
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-16">
        <h1 className="heading text-4xl sm:text-5xl">{title}</h1>
        <div className="mt-3 h-1 w-16 rounded bg-accent-500" />
        {subtitle && <p className="mt-4 max-w-2xl text-lg text-brand-100">{subtitle}</p>}
        {children}
      </div>
      <Mountains className="absolute bottom-0 h-8 w-full text-slate-50 sm:h-12" />
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="heading text-3xl text-brand-950">{title}</h2>
        <div className="mt-1.5 h-1 w-12 rounded bg-accent-500" />
      </div>
      {action}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-4 py-10 ${className}`}>{children}</div>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="animate-pulse text-slate-500">{label}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">{children}</p>;
}
