import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { site } from "@/site.config";
import { MIN_PASSWORD } from "@/lib/invites";
import { findPasswordReset } from "@/lib/password-reset";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field } from "@/components/admin/fields";
import { Badge } from "@/components/brand";
import { Loading } from "@/components/ui";
import { resetPasswordAction } from "./actions";

// The token is in the URL, so don't leak it via the Referer header.
export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default function ResetPage({ params }: PageProps<"/admin/reset/[token]">) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-950 to-brand-700 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Badge className="mx-auto block h-14 w-14" />
          <h1 className="heading mt-3 text-2xl text-brand-950">{site.name}</h1>
          <p className="text-sm text-slate-500">Choose a new password</p>
        </div>
        <Suspense fallback={<Loading />}>
          <ResetForm params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResetForm({ params }: Pick<PageProps<"/admin/reset/[token]">, "params">) {
  const { token } = await params;
  await connection();
  const reset = await findPasswordReset(token);
  if (!reset) {
    return (
      <div className="space-y-4 text-center text-sm text-slate-600">
        <p>This reset link is invalid, has expired, or has already been used.</p>
        <Link href="/admin/forgot" className="btn-secondary">
          Request a new link
        </Link>
      </div>
    );
  }
  return (
    <ActionForm action={resetPasswordAction}>
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-slate-600">
        Resetting the password for <strong>{reset.email}</strong>. This signs you out everywhere else.
      </p>
      {/* Lets password managers save the new password under the right login. */}
      <input type="email" name="username" autoComplete="username" value={reset.email} readOnly hidden />
      <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required hint={`At least ${MIN_PASSWORD} characters.`} />
      <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required />
      <SubmitButton className="btn-primary w-full">Set new password</SubmitButton>
    </ActionForm>
  );
}
