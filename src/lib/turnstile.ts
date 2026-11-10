import "server-only";
import { headers } from "next/headers";

// Cloudflare Turnstile keeps bots off the login and forgot-password forms.
// Set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to turn it on; with them unset
// the forms work without it (e.g. in development). See README "Turnstile".

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Public key for the widget, or "" when Turnstile is off. Read at request time. */
export function turnstileSiteKey() {
  return process.env.TURNSTILE_SECRET_KEY?.trim() ? (process.env.TURNSTILE_SITE_KEY?.trim() ?? "") : "";
}

/** Check the widget's token from a submitted form. Always true when Turnstile is off. */
export async function verifyTurnstile(fd: FormData): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  const token = fd.get("cf-turnstile-response");
  if (typeof token !== "string" || !token) return false;

  const body = new URLSearchParams({ secret, response: token });
  // Behind the Cloudflare Tunnel, this header carries the visitor's real IP.
  const ip = (await headers()).get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(10_000) });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("Turnstile check failed:", data["error-codes"]?.join(", "));
    return data.success === true;
  } catch (e) {
    console.error("Turnstile verification request failed:", e);
    return false;
  }
}

export const TURNSTILE_ERROR = "Please complete the \"verify you're human\" check and try again.";
