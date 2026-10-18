import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/site.config";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field } from "@/components/admin/fields";
import { Badge } from "@/components/brand";
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
        <ActionForm action={login}>
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          <SubmitButton className="btn-primary w-full">Log in</SubmitButton>
        </ActionForm>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-brand-700 hover:underline">
            ← Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
