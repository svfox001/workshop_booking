"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Shown when bookings cannot be loaded, typically because Laravel is not
 * running. Production builds never expose server error details here.
 */
export default function BookingsError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Bookings are unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">
        The booking service could not be reached. Check that the workshop API is running, then try again.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Try again
        </button>
        <Link href="/bookings" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          All bookings
        </Link>
      </div>
    </div>
  );
}
