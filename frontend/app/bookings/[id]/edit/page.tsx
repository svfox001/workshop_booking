import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateBookingAction } from "@/app/bookings/actions";
import { BookingForm } from "@/components/BookingForm";
import { getBooking, getServiceBays } from "@/lib/api";
import { parseBookingId } from "@/lib/route-params";
import { toDateTimeLocal, workshopTimezone } from "@/lib/time";

export const metadata: Metadata = { title: "Edit booking" };

export default async function EditBookingPage({ params }: PageProps<"/bookings/[id]/edit">) {
  const id = parseBookingId((await params).id);
  const [booking, serviceBays] = await Promise.all([getBooking(id), getServiceBays()]);

  if (!booking) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href={`/bookings/${booking.id}`} className="text-blue-700 underline-offset-2 hover:underline">
          ← Back to booking
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit booking #{booking.id}</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <BookingForm
          action={updateBookingAction.bind(null, booking.id)}
          initialValues={{
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            rego: booking.rego,
            service_bay: booking.service_bay,
            starts_at: toDateTimeLocal(booking.starts_at),
            ends_at: toDateTimeLocal(booking.ends_at),
            status: booking.status,
            notes: booking.notes ?? "",
          }}
          serviceBays={serviceBays}
          timezone={workshopTimezone()}
          submitLabel="Save changes"
          cancelHref={`/bookings/${booking.id}`}
        />
      </div>
    </div>
  );
}
