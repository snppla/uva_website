import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { MemberForm, getMemberTypes } from "../member-form";

export default async function NewMember() {
  await requireAdmin();
  return (
    <>
      <AdminTitle title="Add member" />
      <MemberForm types={await getMemberTypes()} />
    </>
  );
}
