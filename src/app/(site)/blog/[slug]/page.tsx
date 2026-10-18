import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPostBySlug } from "@/lib/data";
import { formatLongDate } from "@/lib/dates";
import { Markdown } from "@/lib/markdown";
import { imageUrl } from "@/lib/urls";
import { Loading } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">) {
  const row = await getPostBySlug((await params).slug);
  return { title: row?.post.title ?? "Post not found", description: row?.post.excerpt };
}

export default function PostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/blog" className="heading text-sm text-brand-700 hover:text-accent-600">
        ← All news
      </Link>
      <Suspense fallback={<Loading />}>
        <PostContent params={params} />
      </Suspense>
    </article>
  );
}

async function PostContent({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  const row = await getPostBySlug((await params).slug);
  if (!row) notFound();
  const { post, coverKey } = row;
  return (
    <>
      <h1 className="mt-4 heading text-4xl text-brand-950 sm:text-5xl">{post.title}</h1>
      {post.publishedAt && <p className="mt-2 text-slate-500">{formatLongDate(post.publishedAt)}</p>}
      {coverKey && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(coverKey)} alt="" className="mt-6 w-full rounded-xl" />
      )}
      <Markdown source={post.body} className="mt-8" />
    </>
  );
}
