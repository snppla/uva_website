import type { Resource } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, TextArea } from "@/components/admin/fields";
import { saveResource } from "./actions";

export function ResourceForm({ resource, categories }: { resource?: Resource; categories: string[] }) {
  return (
    <ActionForm action={saveResource} className="space-y-4">
      {resource && <input type="hidden" name="id" value={resource.id} />}
      <Field label="Title" name="title" defaultValue={resource?.title} placeholder="e.g. Club Bylaws" required />
      <Field
        label="Category"
        name="category"
        list="resource-categories"
        defaultValue={resource?.category}
        placeholder="e.g. Club Documents"
        hint="Documents are grouped by category on the Resources page."
      />
      <datalist id="resource-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <TextArea label="Description" name="description" rows={2} defaultValue={resource?.description} />
      <Field label="Sort order" name="sortOrder" type="number" defaultValue={resource?.sortOrder ?? 0} hint="Lower numbers are listed first." />
      <label className="block">
        <span className="label">{resource ? "Replace file (optional)" : "File"}</span>
        {resource && <span className="mb-1 block text-xs text-slate-500">Current: {resource.originalName}</span>}
        <input type="file" name="file" className="text-sm" required={!resource} />
        <span className="mt-1 block text-xs text-slate-500">PDF, Word, images… up to 25 MB.</span>
      </label>
      <SubmitButton>{resource ? "Save" : "Upload"}</SubmitButton>
    </ActionForm>
  );
}
