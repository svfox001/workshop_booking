export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading bookings…</span>
      <div aria-hidden="true" className="h-8 w-48 rounded bg-slate-200" />
      <div aria-hidden="true" className="h-64 rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
