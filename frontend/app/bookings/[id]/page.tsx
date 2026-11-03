import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteBookingButton } from "@/components/DeleteBookingButton";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { getBooking } from "@/lib/api";
import { parseBookingId } from "@/lib/route-params";
import { formatDateTime, formatSchedule, workshopTimezone } from "@/lib/time";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const id = parseBookingId((await params).id);
  const booking = await getBooking(id);

  if (!booking) {
    notFound();
  }

  const { notice } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <Notice notice={notice} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/bookings" className="text-blue-700 underline-offset-2 hover:underline">
          ← All bookings
        </Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{booking.customer_name}</h1>
          <p className="mt-1 text-sm text-slate-600">Booking #{booking.id}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Section title="Customer">
          <Item label="Name">{booking.customer_name}</Item>
          <Item label="Email">
            <a href={`mailto:${booking.customer_email}`} className="text-blue-700 underline-offset-2 hover:underline">
              {booking.customer_email}
            </a>
          </Item>
        </Section>

        <Section title="Caravan">
          <Item label="Registration">
            <span className="font-mono">{booking.rego}</span>
          </Item>
          <Item label="Service bay">{booking.service_bay}</Item>
        </Section>

        <Section title="Schedule" className="sm:col-span-2">
          <Item label="When">{formatSchedule(booking.starts_at, booking.ends_at)}</Item>
          <Item label="Starts">{formatDateTime(booking.starts_at)}</Item>
          <Item label="Ends">{formatDateTime(booking.ends_at)}</Item>
          <Item label="Timezone">{workshopTimezone()}</Item>
        </Section>

        <Section title="Status and notes" className="sm:col-span-2">
          <Item label="Status">
            <StatusBadge status={booking.status} />
          </Item>
          <Item label="Notes">
            {booking.notes ? <span className="whitespace-pre-line">{booking.notes}</span> : <span className="text-slate-500">None</span>}
          </Item>
          {booking.updated_at && <Item label="Last updated">{formatDateTime(booking.updated_at)}</Item>}
        </Section>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-start">
        <Link
          href={`/bookings/${booking.id}/edit`}
          className="inline-flex shrink-0 justify-center whitespace-nowrap rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Edit booking
        </Link>
        <DeleteBookingButton bookingId={booking.id} description={`the booking for ${booking.customer_name} (${booking.rego})`} />
      </div>
    </div>
  );
}

function Section({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <dl className="mt-3 space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
