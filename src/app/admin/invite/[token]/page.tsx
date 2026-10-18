import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { site } from "@/site.config";
import { MIN_PASSWORD, findInvite } from "@/lib/invites";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field } from "@/components/admin/fields";
import { Badge } from "@/components/brand";
import { Loading } from "@/components/ui";
import { acceptInviteAction } from "./actions";

// The token is in the URL, so don't leak it via the Referer header.
export const metadata: Metadata = { title: "Set up your account", referrer: "no-referrer" };

export default function InvitePage({ params }: PageProps<"/admin/invite/[token]">) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-950 to-brand-700 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Badge className="mx-auto block h-14 w-14" />
          <h1 className="heading mt-3 text-2xl text-brand-950">{site.name}</h1>
          <p className="text-sm text-slate-500">Set up your admin account</p>
        </div>
        <Suspense fallback={<Loading />}>
          <InviteForm params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function InviteForm({ params }: Pick<PageProps<"/admin/invite/[token]">, "params">) {
  const { token } = await params;
  await connection();
  const invite = await findInvite(token);
  if (!invite) {
    return (
      <div className="space-y-4 text-center text-sm text-slate-600">
        <p>This invite link is invalid, has expired, or has already been used.</p>
        <p>Ask a club officer for a new one.</p>
        <Link href="/admin/login" className="btn-secondary">
          Go to login
        </Link>
      </div>
    );
  }
  return (
    <ActionForm action={acceptInviteAction}>
      <input type="hidden" name="token" value={token} />
      <Field label="Your name" name="name" defaultValue={invite.name} autoComplete="name" required />
      {invite.email ? (
        <p className="text-sm text-slate-600">
          You&apos;ll log in as <strong>{invite.email}</strong>
        </p>
      ) : (
        <Field label="Email (used to log in)" name="email" type="email" autoComplete="email" required />
      )}
      <Field label="Choose a password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required hint={`At least ${MIN_PASSWORD} characters.`} />
      <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required />
      <SubmitButton className="btn-primary w-full">Create account</SubmitButton>
    </ActionForm>
  );
}
