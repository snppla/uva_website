import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="bg-slate-900 text-slate-400">
        <Suspense fallback={<div className="h-32" />}>
          <SiteFooter />
        </Suspense>
      </footer>
    </>
  );
}
