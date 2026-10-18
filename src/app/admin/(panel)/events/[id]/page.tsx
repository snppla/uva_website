import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, events } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { ConfirmButton } from "@/components/admin/forms";
import { EventForm } from "../event-form";
import { deleteEvent } from "../actions";

export default async function EditEvent({ params }: PageProps<"/admin/events/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const [event] = Number.isInteger(id) ? await db.select().from(events).where(eq(events.id, id)) : [];
  if (!event) notFound();
  return (
    <>
      <AdminTitle title="Edit event">
        <Link href={`/events/${id}`} className="btn-secondary" target="_blank">View</Link>
        <Link href={`/admin/events/new?copy=${id}`} className="btn-secondary">Duplicate</Link>
        <ConfirmButton action={deleteEvent} fields={{ id }} confirm="Delete this event?">
          Delete
        </ConfirmButton>
      </AdminTitle>
      <EventForm event={event} />
    </>
  );
}
