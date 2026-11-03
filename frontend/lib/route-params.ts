import { notFound } from "next/navigation";

/** Parse a booking id from the URL, or show the not-found page for anything that is not a positive integer. */
export function parseBookingId(raw: string): number {
  const id = /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;

  if (!Number.isSafeInteger(id) || id < 1) {
    notFound();
  }

  return id;
}
