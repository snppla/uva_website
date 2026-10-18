import type { Post } from "@/db/schema";
import { imageUrl } from "@/lib/urls";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Checkbox, Field, TextArea } from "@/components/admin/fields";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { savePost } from "./actions";

export function PostForm({ post, coverKey }: { post?: Post; coverKey?: string | null }) {
  return (
    <ActionForm action={savePost} className="card max-w-4xl space-y-5 p-6">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Field label="Title" name="title" defaultValue={post?.title} required />
      <Field
        label="URL slug"
        name="slug"
        defaultValue={post?.slug}
        placeholder="Leave blank to generate from the title"
        hint="The web address of the post, e.g. /blog/spring-fun-fly"
      />
      <TextArea
        label="Summary"
        name="excerpt"
        rows={2}
        defaultValue={post?.excerpt}
        hint="Shown on the news listing and home page."
      />
      <MarkdownEditor label="Body" name="body" defaultValue={post?.body} />
      <div>
        <span className="label">Cover image</span>
        {coverKey && (
          <div className="mb-2 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(coverKey, "thumb")} alt="" className="h-20 rounded" />
            <Checkbox label="Remove cover image" name="removeCover" />
          </div>
        )}
        <input type="file" name="cover" accept="image/*" className="text-sm" />
      </div>
      <Checkbox label="Published (visible on the website)" name="published" defaultChecked={post?.published ?? true} />
      <SubmitButton>Save post</SubmitButton>
    </ActionForm>
  );
}
