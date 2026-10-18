import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { PostForm } from "../post-form";

export default async function NewPost() {
  await requireAdmin();
  return (
    <>
      <AdminTitle title="New post" />
      <PostForm />
    </>
  );
}
