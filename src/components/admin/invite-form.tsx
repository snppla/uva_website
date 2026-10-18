"use client";

import { useActionState, useState } from "react";
import { inviteAdmin } from "@/app/admin/(panel)/account/actions";
import { Field } from "./fields";

/** Creates an invite and shows the one-time link to copy and send. */
export function InviteForm() {
  const [state, action, pending] = useActionState(inviteAdmin, undefined);
  const [copied, setCopied] = useState(false);

  if (state?.link) {
    return (
      <div className="space-y-3 text-sm">
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800">
          Invite created for <strong>{state.email}</strong>. Send them this link. It works once and expires in 7 days.
        </p>
        <input readOnly value={state.link} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link!);
              setCopied(true);
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
            Invite someone else
          </button>
        </div>
        <p className="text-xs text-slate-500">This link won&apos;t be shown again. If it&apos;s lost, just create a new invite.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <Field label="Name" name="name" required />
      <Field label="Email (their login)" name="email" type="email" required />
      <button className="btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create invite link"}
      </button>
    </form>
  );
}
