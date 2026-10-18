"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormState = { error?: string; message?: string } | undefined;

const PendingContext = createContext(false);

/**
 * A form bound to a server action that reports errors/success inline.
 * Submits via a transition rather than the native form action so React
 * doesn't clear the fields — on a validation error the user keeps their input.
 */
export function ActionForm({
  action,
  children,
  className = "space-y-5",
  resetOnSuccess = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.message) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          {state.message}
        </p>
      )}
      <PendingContext value={pending}>{children}</PendingContext>
    </form>
  );
}

export function SubmitButton({ children, className = "btn-primary" }: { children: ReactNode; className?: string }) {
  const { pending: nativePending } = useFormStatus();
  const pending = useContext(PendingContext) || nativePending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/** A one-button form that asks for confirmation first (e.g. Delete). */
export function ConfirmButton({
  action,
  confirm,
  children,
  className = "btn-danger",
  fields = {},
}: {
  action: (formData: FormData) => Promise<void>;
  confirm: string;
  children: ReactNode;
  className?: string;
  fields?: Record<string, string | number>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}
