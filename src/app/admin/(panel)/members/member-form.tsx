import { db, members, membershipPlans, type Member } from "@/db";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, TextArea } from "@/components/admin/fields";
import { saveMember } from "./actions";

export function MemberForm({ member, types }: { member?: Member; types: string[] }) {
  return (
    <ActionForm action={saveMember} className="card max-w-3xl space-y-5 p-6">
      {member && <input type="hidden" name="id" value={member.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" defaultValue={member?.firstName} required />
        <Field label="Last name" name="lastName" defaultValue={member?.lastName} required />
        <Field label="Email" name="email" type="email" defaultValue={member?.email} />
        <Field label="Phone" name="phone" type="tel" defaultValue={member?.phone} />
        <Field label="AMA number" name="amaNumber" defaultValue={member?.amaNumber} />
        <Field label="Membership type" name="membershipType" list="membership-types" defaultValue={member?.membershipType} placeholder="e.g. Adult, Junior, Family" />
        <Field label="Membership expires on" name="expiresOn" type="date" defaultValue={member?.expiresOn ?? undefined} />
      </div>
      <datalist id="membership-types">
        {types.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <TextArea label="Notes" name="notes" rows={3} defaultValue={member?.notes} hint="Private — only visible to admins." />
      <SubmitButton>Save member</SubmitButton>
    </ActionForm>
  );
}

export async function getMemberTypes() {
  const [used, plans] = await Promise.all([
    db.selectDistinct({ t: members.membershipType }).from(members),
    db.select({ t: membershipPlans.name }).from(membershipPlans),
  ]);
  return [...new Set([...plans, ...used].map((r) => r.t).filter(Boolean))];
}
