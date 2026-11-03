import type { Metadata } from "next";
import Link from "next/link";

import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { listBookings } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/status";
import { formatSchedule, workshopTimezone } from "@/lib/time";
import { BOOKING_STATUSES, isBookingStatus, type BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Bookings" };

const MAX_PAGE = 100_000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The URL is the source of truth; invalid values fall back to sensible defaults instead of failing. */
function parseFilters(searchParams: Record<string, string | string[] | undefined>) {
  const rawStatus = first(searchParams.status);
  const rawPage = first(searchParams.page);

  const status = isBookingStatus(rawStatus) ? rawStatus : undefined;
  const page = rawPage && /^\d+$/.test(rawPage) && Number(rawPage) >= 1 && Number(rawPage) <= MAX_PAGE ? Number(rawPage) : 1;

  return {
    status,
    page,
    ignoredStatus: rawStatus && !status ? rawStatus : undefined,
  };
}

function listHref(status: BookingStatus | undefined, page = 1): string {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (page > 1) query.set("page", String(page));
  const search = query.toString();

  return search ? `/bookings?${search}` : "/bookings";
}

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  const params = await searchParams;
  const { status, page, ignoredStatus } = parseFilters(params);
  const result = await listBookings({ status, page });
  const { data: bookings, meta } = result;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-slate-600">Times shown in workshop time ({workshopTimezone()}).</p>
        </div>
        <form method="get" action="/bookings" className="flex items-end gap-2" role="search" aria-label="Filter bookings">
          <div>
            <label htmlFor="status-filter" className="mb-1 block text-sm font-medium text-slate-800">
              Status
            </label>
            <select
              id="status-filter"
              name="status"
              defaultValue={status ?? ""}
              className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            >
              <option value="">All statuses</option>
              {BOOKING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Apply
          </button>
        </form>
      </div>

      <Notice notice={params.notice} />

      {ignoredStatus && (
        <p role="status" className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          “{ignoredStatus}” is not a booking status, so all bookings are shown.
        </p>
      )}

      {bookings.length === 0 ? (
        <EmptyState status={status} page={page} lastPage={meta.last_page} total={meta.total} />
      ) : (
        <>
          <BookingsTable bookings={bookings} />
          <Pagination status={status} currentPage={meta.current_page} lastPage={meta.last_page} from={meta.from} to={meta.to} total={meta.total} />
        </>
      )}
    </div>
  );
}

function EmptyState({ status, page, lastPage, total }: { status?: BookingStatus; page: number; lastPage: number; total: number }) {
  let title: string;
  let body: string;
  let action: { href: string; label: string };

  if (total > 0) {
    title = `There is no page ${page}.`;
    body = `The list has ${lastPage} ${lastPage === 1 ? "page" : "pages"}.`;
    action = { href: listHref(status, lastPage), label: `Go to page ${lastPage}` };
  } else if (status) {
    title = `No ${STATUS_LABELS[status].toLowerCase()} bookings.`;
    body = "No bookings match this filter.";
    action = { href: "/bookings", label: "Show all bookings" };
  } else {
    title = "No bookings yet.";
    body = "Create the first service booking to get started.";
    action = { href: "/bookings/new", label: "Create a booking" };
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
      <Link href={action.href} className="mt-4 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        {action.label}
      </Link>
    </div>
  );
}

function BookingsTable({ bookings }: { bookings: Awaited<ReturnType<typeof listBookings>>["data"] }) {
  return (
    <>
      {/* Phones: one card per booking. */}
      <ul className="space-y-3 md:hidden" aria-label="Bookings">
        {bookings.map((booking) => (
          <li key={booking.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/bookings/${booking.id}`} className="font-semibold text-blue-700 underline-offset-2 hover:underline">
                {booking.customer_name}
              </Link>
              <StatusBadge status={booking.status} />
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Rego</dt>
              <dd className="font-mono">{booking.rego}</dd>
              <dt className="text-slate-500">Bay</dt>
              <dd>{booking.service_bay}</dd>
              <dt className="text-slate-500">When</dt>
              <dd>{formatSchedule(booking.starts_at, booking.ends_at)}</dd>
            </dl>
          </li>
        ))}
      </ul>

      {/* Tablets and up: a table. */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">Service bookings, latest start time first</caption>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Rego</th>
              <th scope="col" className="px-4 py-3">Bay</th>
              <th scope="col" className="px-4 py-3">Schedule</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/bookings/${booking.id}`} className="font-medium text-blue-700 underline-offset-2 hover:underline">
                    {booking.customer_name}
                  </Link>
                  <div className="text-xs text-slate-500">{booking.customer_email}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono">{booking.rego}</td>
                <td className="whitespace-nowrap px-4 py-3">{booking.service_bay}</td>
                <td className="px-4 py-3">{formatSchedule(booking.starts_at, booking.ends_at)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pagination({
  status,
  currentPage,
  lastPage,
  from,
  to,
  total,
}: {
  status?: BookingStatus;
  currentPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
  total: number;
}) {
  const linkClass = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
  const disabledClass = "rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-400";

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        Showing {from}–{to} of {total} · Page {currentPage} of {lastPage}
      </p>
      <div className="flex gap-2">
        {currentPage > 1 ? (
          <Link href={listHref(status, currentPage - 1)} className={linkClass} rel="prev">
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">Previous</span>
        )}
        {currentPage < lastPage ? (
          <Link href={listHref(status, currentPage + 1)} className={linkClass} rel="next">
            Next
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">Next</span>
        )}
      </div>
    </nav>
  );
}
