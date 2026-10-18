import Link from "next/link";
import { Suspense } from "react";
import { getAdmin } from "@/lib/auth";
import { site } from "@/site.config";
import { AdminNav } from "@/components/admin/nav";
import { logout } from "../login/actions";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-brand-950 text-brand-100 md:w-60 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/admin" className="heading block text-lg text-white">
            {site.shortName} Admin
          </Link>
          <Link href="/" className="text-xs text-brand-300 hover:text-white md:mt-1 md:block">
            View website ↗
          </Link>
        </div>
        <AdminNav />
        <div className="border-t border-white/10 px-4 py-4 text-sm">
          <Suspense>
            <SignedInAs />
          </Suspense>
          <form action={logout}>
            <button className="mt-1 text-brand-300 hover:text-white">Log out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}

async function SignedInAs() {
  const admin = await getAdmin();
  return admin ? <p className="truncate text-brand-300">Signed in as {admin.name}</p> : null;
}
