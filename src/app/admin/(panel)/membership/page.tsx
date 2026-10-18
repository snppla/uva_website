import Link from "next/link";
import { getMembershipPlans } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import type { MembershipPlan } from "@/db/schema";
import { AdminTitle, Field, TextArea } from "@/components/admin/fields";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/admin/forms";
import { deletePlan, savePlan } from "./actions";

export default async function MembershipAdmin() {
  await requireAdmin();
  const plans = await getMembershipPlans();
  return (
    <>
      <AdminTitle title="Membership & PayPal">
        <Link href="/membership" className="btn-secondary" target="_blank">View page</Link>
      </AdminTitle>
      <div className="mb-6 max-w-3xl space-y-2 text-sm text-slate-600">
        <p>
          Each membership option appears on the Membership page with a way to pay through PayPal. Use either:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>A PayPal button ID</strong> (recommended), from a PayPal &quot;Pay Now&quot; button, e.g.{" "}
            <code>ABCD1234EFGH5</code>. The page asks for the member&apos;s name, email, phone, AMA # and address and
            sends them to PayPal with the payment, so they show up on the payment in PayPal.
          </li>
          <li>
            <strong>A PayPal link</strong>, such as a PayPal payment link or <code>https://paypal.me/yourclub/75</code>.
            Members just get a button; ask them to put their name and AMA # in the PayPal note.
          </li>
        </ul>
        <p>
          When a payment arrives, open <Link href="/admin/members" className="text-brand-700 underline">Members</Link> and
          click <em>Renew +1 yr</em> for that member. The intro text above the buttons is edited under{" "}
          <Link href="/admin/pages" className="text-brand-700 underline">Page content</Link>.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map((p) => (
          <PlanForm key={p.id} plan={p} />
        ))}
        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Add a membership option</h2>
          <PlanForm />
        </div>
      </div>
    </>
  );
}

function PlanForm({ plan }: { plan?: MembershipPlan }) {
  return (
    <div className="card p-5">
      <ActionForm action={savePlan} className="space-y-4" resetOnSuccess={!plan}>
        {plan && <input type="hidden" name="id" value={plan.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="name" defaultValue={plan?.name} placeholder="e.g. Adult" required />
          <Field label="Price (as displayed)" name="price" defaultValue={plan?.price} placeholder="e.g. $60 / year" required />
        </div>
        <TextArea label="Description" name="description" rows={2} defaultValue={plan?.description} />
        <Field
          label="PayPal button ID"
          name="paypalButtonId"
          defaultValue={plan?.paypalButtonId}
          placeholder="e.g. ABCD1234EFGH5"
          hint="The hosted_button_id of a PayPal “Pay Now” button. Leave blank to use a link instead."
        />
        <Field label="…or PayPal link" name="paypalUrl" type="url" defaultValue={plan?.paypalUrl} placeholder="https://www.paypal.com/ncp/payment/…" />
        <Field label="Sort order" name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} />
        <SubmitButton>{plan ? "Save" : "Add option"}</SubmitButton>
      </ActionForm>
      {plan && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <ConfirmButton action={deletePlan} fields={{ id: plan.id }} confirm={`Remove the “${plan.name}” option?`} className="text-sm text-red-600 hover:underline">
            Remove option
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
