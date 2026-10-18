"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "News posts" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/membership", label: "Membership & PayPal" },
  { href: "/admin/pages", label: "Page content" },
  { href: "/admin/account", label: "Admins & password" },
];

export function AdminNav() {
  return (
    <Suspense fallback={<NavList pathname="" />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  return <NavList pathname={usePathname()} />;
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:block md:space-y-0.5 md:pb-4">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block shrink-0 rounded-md px-3 py-2 text-sm whitespace-nowrap ${
              active ? "bg-white/10 font-semibold text-white shadow-[inset_3px_0_0] shadow-accent-500" : "hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
