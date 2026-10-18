import { eq } from "drizzle-orm";
import { db, events } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { EventForm } from "../event-form";

export default async function NewEvent({ searchParams }: PageProps<"/admin/events/new">) {
  await requireAdmin();
  const copyId = Number((await searchParams).copy);
  const [source] = Number.isInteger(copyId) && copyId > 0 ? await db.select().from(events).where(eq(events.id, copyId)) : [];
  return (
    <>
      <AdminTitle title={source ? `New event (copy of “${source.title}”)` : "New event"} />
      <EventForm event={source} copy />
    </>
  );
}
