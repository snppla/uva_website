import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/lib/data";
import { directionsUrl, parseFieldLocation } from "@/lib/field";
import { Markdown } from "@/lib/markdown";
import { ClubJsonLd } from "@/components/club-json-ld";
import { Container, Loading, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "RC Flying Field in Saratoga Springs, Utah",
  description:
    "Where to fly RC in Utah County: the Utah Valley Aeromodelers field on the Jordan River in Saratoga Springs, with a paved runway, covered pavilion and pit tables. Address, map and directions.",
};

export default function FieldPage() {
  return (
    <>
      <PageHeader title="The flying field" subtitle="A radio-control flying field on the Jordan River in Saratoga Springs, Utah County." />
      <Container className="max-w-4xl">
        <Suspense fallback={<Loading />}>
          <FieldContent />
        </Suspense>
      </Container>
    </>
  );
}

async function FieldContent() {
  const { fieldAddress, fieldInfo } = await getSettings();
  const field = parseFieldLocation(fieldAddress);
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div>
          <h2 className="heading text-2xl text-brand-950">Address</h2>
          <address className="mt-2 whitespace-pre-line text-slate-700 not-italic">{field.lines.join("\n")}</address>
          {field.lat !== undefined && (
            <p className="mt-1 text-sm text-slate-500">
              {field.lat}, {field.lng}
            </p>
          )}
          <a href={directionsUrl(field)} target="_blank" rel="noopener noreferrer" className="btn-accent heading mt-4 inline-block px-5 py-2.5">
            Get directions
          </a>
        </div>
        {field.lat !== undefined && (
          <iframe
            title="Map of the flying field"
            src={`https://maps.google.com/maps?q=${field.lat},${field.lng}&z=15&output=embed`}
            className="h-72 w-full rounded-lg border-0 md:h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
      <Markdown source={fieldInfo} />
      <ClubJsonLd />
    </div>
  );
}
