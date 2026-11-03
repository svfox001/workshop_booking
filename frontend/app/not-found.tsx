import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you were looking for does not exist.</p>
      <Link href="/bookings" className="mt-6 inline-block text-sm font-medium text-blue-700 underline">
        Go to bookings
      </Link>
    </div>
  );
}
