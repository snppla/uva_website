"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, events } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { contentChanged, int, str, type FormState } from "@/lib/admin";
import { fromClubTime } from "@/lib/dates";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export async function saveEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title");
  const startDate = str(fd, "startDate");
  const startTime = str(fd, "startTime");
  const endDate = str(fd, "endDate") || startDate;
  const endTime = str(fd, "endTime");

  if (!title) return { error: "Title is required." };
  if (!DATE.test(startDate) || !DATE.test(endDate)) return { error: "Please enter a valid date." };
  if ((startTime && !TIME.test(startTime)) || (endTime && !TIME.test(endTime))) {
    return { error: "Please enter a valid time." };
  }

  // No start time means an all-day event.
  const allDay = !startTime;
  const startsAt = fromClubTime(startDate, startTime || "00:00");
  let endsAt: Date | null = null;
  if (allDay) {
    if (endDate !== startDate) endsAt = fromClubTime(endDate, "00:00");
  } else if (endTime || endDate !== startDate) {
    endsAt = fromClubTime(endDate, endTime || startTime);
  }
  if (endsAt && endsAt < startsAt) return { error: "The end must be after the start." };

  const values = { title, startsAt, endsAt, allDay, location: str(fd, "location"), description: str(fd, "description") };
  if (id) await db.update(events).set(values).where(eq(events.id, id));
  else await db.insert(events).values(values);

  contentChanged();
  redirect("/admin/events");
}

export async function deleteEvent(fd: FormData) {
  await requireAdmin();
  await db.delete(events).where(eq(events.id, int(fd, "id")));
  contentChanged();
  redirect("/admin/events");
}
