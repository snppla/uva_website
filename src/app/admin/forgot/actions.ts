"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { str, type FormState } from "@/lib/admin";
import { emailConfigured, sendEmail } from "@/lib/email";
import { RESET_MINUTES, createPasswordReset, resetPath } from "@/lib/password-reset";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";
import { siteUrl } from "@/lib/urls";
import { site } from "@/site.config";

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!emailConfigured()) return { error: "Password reset by email isn't available. Ask another admin for help." };
  if (!(await verifyTurnstile(fd))) return { error: TURNSTILE_ERROR };
  const email = str(fd, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  // Look up the account and send the email after responding, so the reply is the same
  // (and takes as long) whether or not that email belongs to an admin.
  after(async () => {
    try {
      const reset = await createPasswordReset(email);
      if (!reset) return;
      const link = `${siteUrl()}${resetPath(reset.token)}`;
      await sendEmail({
        to: reset.admin.email,
        subject: `Reset your ${site.shortName} website password`,
        text:
          `Hi ${reset.admin.name},\n\n` +
          `Someone (hopefully you) asked to reset the password for your ${site.name} website admin account.\n\n` +
          `Choose a new password here:\n${link}\n\n` +
          `The link works once and expires in ${RESET_MINUTES} minutes. ` +
          `If you didn't ask for this, ignore this email and your password won't change.`,
      });
    } catch (e) {
      console.error("Password reset email failed:", e);
    }
  });

  redirect("/admin/forgot/sent");
}
