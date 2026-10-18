import { getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { SETTINGS, type SettingKey } from "@/lib/settings";
import { imageUrl } from "@/lib/urls";
import { AdminTitle, Checkbox, Field, TextArea } from "@/components/admin/fields";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { saveSettings } from "./actions";

export default async function PagesAdmin() {
  await requireAdmin();
  const values = await getSettings();
  return (
    <>
      <AdminTitle title="Page content" />
      <ActionForm action={saveSettings} className="card max-w-4xl space-y-6 p-6">
        {(Object.keys(SETTINGS) as SettingKey[]).map((key) => {
          const s = SETTINGS[key];
          const hint = "hint" in s ? s.hint : undefined;
          switch (s.type) {
            case "markdown":
              return <MarkdownEditor key={key} name={key} label={s.label} defaultValue={values[key]} rows={key === "about" ? 18 : 6} />;
            case "textarea":
              return <TextArea key={key} name={key} label={s.label} defaultValue={values[key]} rows={2} hint={hint} />;
            case "image":
              return (
                <div key={key}>
                  <span className="label">{s.label}</span>
                  {values[key] && (
                    <div className="mb-2 flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(values[key], "thumb")} alt="" className="h-20 rounded" />
                      <Checkbox label="Remove photo" name={`${key}:remove`} />
                    </div>
                  )}
                  <input type="file" name={key} accept="image/*" className="text-sm" />
                  {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
                </div>
              );
            default:
              return <Field key={key} name={key} label={s.label} type={s.type === "url" ? "url" : "text"} defaultValue={values[key]} hint={hint} />;
          }
        })}
        <SubmitButton>Save all</SubmitButton>
      </ActionForm>
    </>
  );
}
