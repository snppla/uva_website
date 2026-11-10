import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { countPublishedPosts, getPublishedPosts } from "@/lib/data";
import { PostCard } from "@/components/cards";
import { Container, Empty, Loading, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "News",
  description: "News from Utah Valley Aeromodelers, the radio-control flying club in Saratoga Springs, Utah County.",
};

const PER_PAGE = 12;

export default function BlogPage({ searchParams }: PageProps<"/blog">) {
  return (
    <>
      <PageHeader title="Club news" subtitle="Updates, stories and reports from the field." />
      <Container>
        <Suspense fallback={<Loading />}>
          <PostList searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function PostList({ searchParams }: Pick<PageProps<"/blog">, "searchParams">) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [posts, total] = await Promise.all([
    getPublishedPosts(PER_PAGE, (page - 1) * PER_PAGE),
    countPublishedPosts(),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  if (!posts.length) return <Empty>No posts yet — check back soon.</Empty>;
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
      {pages > 1 && (
        <nav className="mt-10 flex justify-center gap-3">
          {page > 1 && (
            <Link href={`/blog?page=${page - 1}`} className="btn-secondary">
              ← Newer
            </Link>
          )}
          <span className="self-center text-sm text-slate-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/blog?page=${page + 1}`} className="btn-secondary">
              Older →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
