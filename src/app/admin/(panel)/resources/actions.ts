"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, resources } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { contentChanged, errorMessage, fileField, int, str, type FormState } from "@/lib/admin";
import { deleteFile, saveFile } from "@/lib/storage";

export async function saveResource(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title");
  if (!title) return { error: "Title is required." };
  const file = fileField(fd, "file");
  if (!id && !file) return { error: "Please choose a file to upload." };

  const [existing] = id ? await db.select().from(resources).where(eq(resources.id, id)) : [];
  if (id && !existing) return { error: "Document not found." };

  let fileValues = {};
  if (file) {
    try {
      const saved = await saveFile(file);
      fileValues = { key: saved.key, size: saved.size, mimeType: saved.mimeType, originalName: file.name };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }

  const values = {
    title,
    description: str(fd, "description"),
    category: str(fd, "category") || "General",
    sortOrder: int(fd, "sortOrder"),
    ...fileValues,
  };
  if (existing) {
    await db.update(resources).set(values).where(eq(resources.id, id));
    if (file) await deleteFile(existing.key);
  } else {
    await db.insert(resources).values(values as typeof resources.$inferInsert);
  }
  contentChanged();
  redirect("/admin/resources");
}

export async function deleteResource(fd: FormData) {
  await requireAdmin();
  const [row] = await db.delete(resources).where(eq(resources.id, int(fd, "id"))).returning();
  if (row) await deleteFile(row.key);
  contentChanged();
  redirect("/admin/resources");
}
