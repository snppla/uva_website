"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { site } from "@/site.config";
import { Logo } from "./brand";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label={`${site.name} home`}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLinks className="heading rounded px-3 py-2 text-[15px] text-brand-100 transition-colors hover:text-white" active="text-white shadow-[inset_0_-2px_0] shadow-accent-500" />
          <Link href="/membership" className="btn-accent heading ml-3 text-[15px]">
            Join / Renew
          </Link>
        </nav>
        <button
          className="rounded-md p-2 hover:bg-white/10 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-4 pt-2 pb-4 lg:hidden">
          <NavLinks
            className="heading block rounded px-3 py-2.5 text-lg text-brand-100 hover:bg-white/5 hover:text-white"
            active="bg-white/10 text-white"
            onClick={() => setOpen(false)}
          />
          <Link href="/membership" onClick={() => setOpen(false)} className="btn-accent heading mt-3 w-full text-base">
            Join / Renew
          </Link>
        </nav>
      )}
    </header>
  );
}

type LinksProps = { className: string; active: string; onClick?: () => void };

// The current path is only known at request time, so the highlighted links
// stream in; the fallback shows the same links without highlighting.
function NavLinks(props: LinksProps) {
  return (
    <Suspense fallback={<Links {...props} pathname="" />}>
      <ActiveLinks {...props} />
    </Suspense>
  );
}

function ActiveLinks(props: LinksProps) {
  return <Links {...props} pathname={usePathname()} />;
}

function Links({ className, active, onClick, pathname }: LinksProps & { pathname: string }) {
  return site.nav.map((item) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link key={item.href} href={item.href} onClick={onClick} className={`${className} ${isActive ? active : ""}`}>
        {item.label}
      </Link>
    );
  });
}
