import { requireAdmin } from "@/lib/auth";
import { AdminTitle } from "@/components/admin/fields";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { importMembers } from "../actions";

export default async function ImportMembers() {
  await requireAdmin();
  return (
    <>
      <AdminTitle title="Import members from a spreadsheet" />
      <div className="card max-w-2xl space-y-4 p-6 text-sm text-slate-700">
        <p>
          Save your spreadsheet as <strong>CSV</strong> (in Excel or Google Sheets: File → Save as / Download → CSV). The
          first row must be column headings. Recognised columns:
        </p>
        <p className="rounded bg-slate-100 p-3 font-mono text-xs">
          First Name, Last Name, Email, Phone, AMA Number, Membership Type, Expires On, Notes
        </p>
        <p>
          Only first and last name are required. Dates can be <code>2026-12-31</code> or <code>12/31/2026</code>. Members
          already in the system (matched by email, or by name if there&apos;s no email) are updated rather than duplicated.
        </p>
        <ActionForm action={importMembers} resetOnSuccess>
          <input type="file" name="csv" accept=".csv,text/csv" required className="block" />
          <SubmitButton>Import</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
