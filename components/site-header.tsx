"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

const appLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/companies", label: "Companies" },
  { href: "/upload", label: "Upload" },
  { href: "/job-match", label: "Job Match" },
  { href: "/history", label: "History" },
  { href: "/reports", label: "Reports" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAuthed = Boolean(session?.user?.id);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-6 md:gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 text-sm font-bold text-white shadow-sm">
              C
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 md:text-lg">CareerMind</span>
          </Link>
          {isAuthed ? (
            <nav className="hidden min-w-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 p-1 md:flex">
              {appLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    pathname === link.href
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isAuthed ? (
            <>
              <span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">
                {session?.user?.email}
              </span>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/auth/signin">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
