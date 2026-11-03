import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Workshop Bookings",
    template: "%s · Workshop Bookings",
  },
  description: "Manage caravan service bookings and service bay assignments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className="h-full">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          Skip to content
        </a>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/bookings" className="text-base font-semibold tracking-tight text-slate-900">
              Workshop Bookings
            </Link>
            <nav aria-label="Main">
              <ul className="flex items-center gap-2 text-sm">
                <li>
                  <Link href="/bookings" className="rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                    Bookings
                  </Link>
                </li>
                <li>
                  <Link
                    href="/bookings/new"
                    className="rounded-md bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800"
                  >
                    New booking
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
