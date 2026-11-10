import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { site } from "@/site.config";
import { emailConfigured } from "@/lib/email";
import { turnstileSiteKey } from "@/lib/turnstile";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field } from "@/components/admin/fields";
import { Turnstile } from "@/components/admin/turnstile";
import { Badge } from "@/components/brand";
import { Loading } from "@/components/ui";
import { requestPasswordReset } from "./actions";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-950 to-brand-700 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Badge className="mx-auto block h-14 w-14" />
          <h1 className="heading mt-3 text-2xl text-brand-950">{site.name}</h1>
          <p className="text-sm text-slate-500">Reset your password</p>
        </div>
        <Suspense fallback={<Loading />}>
          <ForgotForm />
        </Suspense>
        <p className="mt-6 text-center text-sm">
          <Link href="/admin/login" className="text-brand-700 hover:underline">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

async function ForgotForm() {
  await connection(); // read the email/Turnstile settings at request time, not build time
  if (!emailConfigured()) {
    return (
      <p className="text-center text-sm text-slate-600">
        Password reset by email isn&apos;t set up on this site. Ask another admin to remove your account and invite you
        again.
      </p>
    );
  }
  return (
    <ActionForm action={requestPasswordReset}>
      <p className="text-sm text-slate-600">Enter your login email and we&apos;ll send you a link to choose a new password.</p>
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Turnstile siteKey={turnstileSiteKey()} action="forgot-password" />
      <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">
        Email me a reset link
      </SubmitButton>
    </ActionForm>
  );
}
