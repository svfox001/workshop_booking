import Link from "next/link";

export default function BookingNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Booking not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        This booking does not exist. It may have been deleted by someone else.
      </p>
      <Link href="/bookings" className="mt-6 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        Back to bookings
      </Link>
    </div>
  );
}
