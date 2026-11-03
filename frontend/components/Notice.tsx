const MESSAGES: Record<string, string> = {
  created: "Booking created.",
  updated: "Booking updated.",
  deleted: "Booking deleted.",
  "already-deleted": "That booking had already been deleted by someone else.",
};

/** Success message carried in the ?notice= query parameter after a redirect. */
export function Notice({ notice }: { notice: string | string[] | undefined }) {
  const message = typeof notice === "string" ? MESSAGES[notice] : undefined;

  if (!message) {
    return null;
  }

  return (
    <div role="status" className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
      {message}
    </div>
  );
}
