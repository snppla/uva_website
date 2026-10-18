import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, resources } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { ConfirmButton } from "@/components/admin/forms";
import { ResourceForm } from "../resource-form";
import { deleteResource } from "../actions";

export default async function EditResource({ params }: PageProps<"/admin/resources/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const [resource] = Number.isInteger(id) ? await db.select().from(resources).where(eq(resources.id, id)) : [];
  if (!resource) notFound();
  const categories = (await db.selectDistinct({ c: resources.category }).from(resources)).map((r) => r.c);
  return (
    <>
      <AdminTitle title="Edit document">
        <ConfirmButton action={deleteResource} fields={{ id }} confirm="Delete this document?">
          Delete
        </ConfirmButton>
      </AdminTitle>
      <div className="card max-w-2xl p-6">
        <ResourceForm resource={resource} categories={categories} />
      </div>
    </>
  );
}
