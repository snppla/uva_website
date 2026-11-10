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
import { login } from "./actions";

export const metadata: Metadata = { title: "Officer login" };

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-950 to-brand-700 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Badge className="mx-auto block h-14 w-14" />
          <h1 className="heading mt-3 text-2xl text-brand-950">{site.name}</h1>
          <p className="text-sm text-slate-500">Officer login</p>
        </div>
        <Suspense fallback={<Loading />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-brand-700 hover:underline">
            ← Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}

async function LoginForm() {
  await connection(); // read the email/Turnstile settings at request time, not build time
  return (
    <ActionForm action={login}>
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Turnstile siteKey={turnstileSiteKey()} action="login" />
      <SubmitButton className="btn-primary w-full" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
      {emailConfigured() && (
        <p className="text-center text-sm">
          <Link href="/admin/forgot" className="text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </p>
      )}
    </ActionForm>
  );
}
