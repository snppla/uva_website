import { and, asc, gt, isNull, ne } from "drizzle-orm";
import { db, adminInvites, admins } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatShortDate } from "@/lib/dates";
import { AdminTitle, Field } from "@/components/admin/fields";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/admin/forms";
import { InviteForm } from "@/components/admin/invite-form";
import { changePassword, removeAdmin, revokeInvite, updateProfile } from "./actions";

export default async function AccountAdmin() {
  const me = await requireAdmin();
  const [all, pending] = await Promise.all([
    db.select({ id: admins.id, name: admins.name, email: admins.email }).from(admins).orderBy(asc(admins.name)),
    db
      .select()
      .from(adminInvites)
      .where(and(isNull(adminInvites.usedAt), gt(adminInvites.expiresAt, new Date()), ne(adminInvites.email, "")))
      .orderBy(asc(adminInvites.createdAt)),
  ]);
  return (
    <>
      <AdminTitle title="Admins & password" />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Your profile</h2>
          <ActionForm action={updateProfile} className="space-y-4">
            <Field label="Display name" name="name" defaultValue={me.name} required />
            <p className="text-sm text-slate-500">Login email: {me.email}</p>
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Change password</h2>
          <ActionForm action={changePassword} className="space-y-4" resetOnSuccess>
            <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
            <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
            <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required />
            <SubmitButton>Change password</SubmitButton>
          </ActionForm>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Admin accounts</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {all.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {a.name} {a.id === me.id && <span className="text-xs text-slate-500">(you)</span>}
                  </p>
                  <p className="text-slate-500">{a.email}</p>
                </div>
                {a.id !== me.id && (
                  <ConfirmButton action={removeAdmin} fields={{ id: a.id }} confirm={`Remove admin access for ${a.name}?`} className="text-xs text-red-600 hover:underline">
                    Remove
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-1 font-semibold text-slate-900">Invite an admin</h2>
          <p className="mb-3 text-sm text-slate-500">They&apos;ll get a link to choose their own password.</p>
          <InviteForm />
          {pending.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Pending invites</h3>
              <ul className="divide-y divide-slate-100 text-sm">
                {pending.map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-slate-900">{i.name}</p>
                      <p className="text-slate-500">
                        {i.email} · expires {formatShortDate(i.expiresAt)}
                      </p>
                    </div>
                    <ConfirmButton action={revokeInvite} fields={{ id: i.id }} confirm={`Cancel the invite for ${i.email}?`} className="text-xs text-red-600 hover:underline">
                      Revoke
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
