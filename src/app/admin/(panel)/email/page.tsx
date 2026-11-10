import { requireAdmin } from "@/lib/auth";
import { emailConfig, missingEmailSettings } from "@/lib/email";
import { AdminTitle, Field } from "@/components/admin/fields";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { checkConnection, sendTestEmail } from "./actions";

export default async function EmailAdmin() {
  const admin = await requireAdmin();
  const cfg = emailConfig();
  const missing = missingEmailSettings();

  return (
    <>
      <AdminTitle title="Email" />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Sending settings</h2>
          {cfg ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-slate-500">Mail server</dt>
              <dd className="break-all text-slate-900">
                {cfg.host}:{cfg.port} <span className="text-slate-500">({cfg.secure ? "TLS" : "STARTTLS"})</span>
              </dd>
              <dt className="text-slate-500">Login</dt>
              <dd className="break-all text-slate-900">{cfg.user}</dd>
              <dt className="text-slate-500">From</dt>
              <dd className="break-all text-slate-900">{cfg.from}</dd>
              <dt className="text-slate-500">Replies go to</dt>
              <dd className="break-all text-slate-900">{cfg.replyTo || cfg.from}</dd>
            </dl>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Email isn&apos;t set up yet. Missing: {missing.map((m, i) => (
                <span key={m}>
                  {i > 0 && ", "}
                  <code>{m}</code>
                </span>
              ))}
              .
            </p>
          )}
          <p className="mt-4 text-sm text-slate-500">
            These come from the server&apos;s environment settings (<code>.env</code>), not this page. After changing them,
            restart the app.
          </p>
          {cfg && (
            <ActionForm action={checkConnection} className="mt-4 space-y-3">
              <SubmitButton className="btn-secondary" pendingLabel="Checking…">
                Check connection
              </SubmitButton>
            </ActionForm>
          )}
        </section>

        {cfg && (
          <section className="card p-5">
            <h2 className="mb-1 font-semibold text-slate-900">Send a test email</h2>
            <p className="mb-3 text-sm text-slate-500">Confirms mail actually arrives, and not in the spam folder.</p>
            <ActionForm action={sendTestEmail} className="space-y-4">
              <Field label="Send to" name="to" type="email" defaultValue={admin.email} required />
              <SubmitButton pendingLabel="Sending…">Send test email</SubmitButton>
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
