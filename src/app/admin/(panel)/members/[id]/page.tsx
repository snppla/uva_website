import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, members } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { ConfirmButton } from "@/components/admin/forms";
import { MemberForm, getMemberTypes } from "../member-form";
import { deleteMember, renewMember } from "../actions";

export default async function EditMember({ params }: PageProps<"/admin/members/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const [member] = Number.isInteger(id) ? await db.select().from(members).where(eq(members.id, id)) : [];
  if (!member) notFound();
  return (
    <>
      <AdminTitle title={`${member.firstName} ${member.lastName}`}>
        <form action={renewMember}>
          <input type="hidden" name="id" value={id} />
          <button className="btn-secondary">Renew +1 year</button>
        </form>
        <ConfirmButton action={deleteMember} fields={{ id }} confirm="Delete this member record?">
          Delete
        </ConfirmButton>
      </AdminTitle>
      <MemberForm member={member} types={await getMemberTypes()} />
    </>
  );
}
