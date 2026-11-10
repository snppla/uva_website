"use server";

import { requireAdmin } from "@/lib/auth";
import { errorMessage, str, type FormState } from "@/lib/admin";
import { sendEmail, verifyEmailConnection } from "@/lib/email";
import { site } from "@/site.config";

export async function checkConnection(): Promise<FormState> {
  await requireAdmin();
  try {
    await verifyEmailConnection();
    return { message: "Connected and logged in to the mail server." };
  } catch (e) {
    return { error: `Couldn't connect: ${errorMessage(e)}` };
  }
}

export async function sendTestEmail(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const to = str(fd, "to");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Enter a valid email address." };
  try {
    await sendEmail({
      to,
      subject: `Test email from the ${site.shortName} website`,
      text: `This is a test email sent by ${admin.name} from the ${site.name} admin panel.\n\nIf you're reading this, email sending works.`,
    });
    return { message: `Sent to ${to}. Check the inbox (and the spam folder).` };
  } catch (e) {
    return { error: `Sending failed: ${errorMessage(e)}` };
  }
}
