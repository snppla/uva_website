"use server";

import { requireAdmin } from "@/lib/auth";
import { errorMessage, fileField, storeImage } from "@/lib/admin";
import { renderMarkdown } from "@/lib/markdown";
import { imageUrl } from "@/lib/urls";

export async function uploadInlineImage(fd: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = fileField(fd, "image");
  if (!file) return { error: "No image selected." };
  try {
    const img = await storeImage(file);
    return { url: imageUrl(img.key) };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function previewMarkdown(source: string) {
  await requireAdmin();
  return renderMarkdown(source);
}
