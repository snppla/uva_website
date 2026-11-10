import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/lib/data";
import { Markdown } from "@/lib/markdown";
import { Container, Loading, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "Utah Valley Aeromodelers is an all-ages radio-control flying club in Utah Valley with more than 40 years of history: who we are, our field, events and officers.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About the club" />
      <Container className="max-w-3xl">
        <Suspense fallback={<Loading />}>
          <AboutContent />
        </Suspense>
      </Container>
    </>
  );
}

async function AboutContent() {
  const { about } = await getSettings();
  return <Markdown source={about} />;
}
