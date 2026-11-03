import type { Metadata } from "next";
import Link from "next/link";

import { createBookingAction } from "@/app/bookings/actions";
import { BookingForm } from "@/components/BookingForm";
import { getServiceBays } from "@/lib/api";
import { EMPTY_BOOKING_VALUES } from "@/lib/booking-form";
import { workshopTimezone } from "@/lib/time";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBookingPage() {
  const serviceBays = await getServiceBays();

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/bookings" className="text-blue-700 underline-offset-2 hover:underline">
          ← All bookings
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New booking</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <BookingForm
          action={createBookingAction}
          initialValues={EMPTY_BOOKING_VALUES}
          serviceBays={serviceBays}
          timezone={workshopTimezone()}
          submitLabel="Create booking"
          cancelHref="/bookings"
        />
      </div>
    </div>
  );
}
