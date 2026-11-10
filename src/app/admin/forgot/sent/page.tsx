import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/site.config";
import { RESET_MINUTES } from "@/lib/password-reset";
import { Badge } from "@/components/brand";

export const metadata: Metadata = { title: "Check your email" };

export default function ResetSentPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-950 to-brand-700 p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <Badge className="mx-auto block h-14 w-14" />
        <p className="heading mt-3 text-sm text-slate-500">{site.name}</p>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto mt-6 h-14 w-14 rounded-full bg-brand-50 p-3 text-brand-700"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        <h1 className="heading mt-4 text-2xl text-brand-950">Check your email</h1>
        <p className="mt-3 text-sm text-slate-600">
          If that address belongs to an admin account, we&apos;ve sent it a link to choose a new password.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          The link works once and expires in {RESET_MINUTES / 60 === 1 ? "an hour" : `${RESET_MINUTES} minutes`}.
        </p>

        <div className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-left text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Don&apos;t see it?</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Give it a minute or two</li>
            <li>Check your spam or junk folder</li>
            <li>Make sure you used the email you log in with</li>
          </ul>
        </div>

        <Link href="/admin/login" className="btn-primary mt-6 block w-full">
          Back to login
        </Link>
        <p className="mt-4 text-sm">
          <Link href="/admin/forgot" className="text-brand-700 hover:underline">
            Send another link
          </Link>
        </p>
      </div>
    </div>
  );
}
