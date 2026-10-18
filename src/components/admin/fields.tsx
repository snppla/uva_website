import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Common = { label: string; hint?: ReactNode };

export function Field({ label, hint, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...props} />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className="input" rows={4} {...props} />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-700" {...props} />
      {label}
    </label>
  );
}

export function AdminTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
