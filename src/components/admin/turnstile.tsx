"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; action?: string; "refresh-expired"?: "auto" }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoad: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile failed to load")));
    script.onerror = () => {
      scriptLoad = undefined;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/**
 * Cloudflare Turnstile "verify you're human" widget. Put it inside a form: it adds a
 * hidden `cf-turnstile-response` field. Renders nothing when `siteKey` is empty.
 * Tokens work once, so the widget resets itself after each submit (e.g. a wrong password).
 */
export function Turnstile({ siteKey, action }: { siteKey: string; action?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!siteKey || !el) return;
    let id: string | undefined;
    let api: TurnstileApi | undefined;
    let cancelled = false;

    // The form reads its fields synchronously on submit; reset afterwards for the next try.
    const form = el.closest("form");
    const onSubmit = () => setTimeout(() => id && api?.reset(id), 0);
    form?.addEventListener("submit", onSubmit);

    loadTurnstile()
      .then((t) => {
        if (cancelled) return;
        api = t;
        id = t.render(el, { sitekey: siteKey, action, "refresh-expired": "auto" });
      })
      .catch((e) => console.error(e));

    return () => {
      cancelled = true;
      form?.removeEventListener("submit", onSubmit);
      if (id) api?.remove(id);
    };
  }, [siteKey, action]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
