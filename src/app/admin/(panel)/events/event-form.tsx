import type { Event } from "@/db/schema";
import { clubDate, clubTime } from "@/lib/dates";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field } from "@/components/admin/fields";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { site } from "@/site.config";
import { saveEvent } from "./actions";

/** `copy` pre-fills the form from an existing event but saves a new one. */
export function EventForm({ event, copy = false }: { event?: Event; copy?: boolean }) {
  const end = event?.endsAt;
  return (
    <ActionForm action={saveEvent} className="card max-w-4xl space-y-5 p-6">
      {event && !copy && <input type="hidden" name="id" value={event.id} />}
      <Field label="Title" name="title" defaultValue={event?.title} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" name="startDate" type="date" required defaultValue={event && clubDate(event.startsAt)} />
        <Field
          label="Start time"
          name="startTime"
          type="time"
          defaultValue={event && !event.allDay ? clubTime(event.startsAt) : undefined}
          hint="Leave blank for an all-day event."
        />
        <Field label="End date" name="endDate" type="date" defaultValue={end ? clubDate(end) : undefined} hint="Optional — for multi-day events." />
        <Field label="End time" name="endTime" type="time" defaultValue={end && !event?.allDay ? clubTime(end) : undefined} />
      </div>
      <p className="text-xs text-slate-500">Times are in the club&apos;s time zone ({site.timeZone}).</p>
      <Field label="Location" name="location" defaultValue={event?.location} placeholder="e.g. Club flying field" />
      <MarkdownEditor label="Details" name="description" defaultValue={event?.description} rows={10} />
      <SubmitButton>Save event</SubmitButton>
    </ActionForm>
  );
}
