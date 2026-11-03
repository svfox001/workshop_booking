"use client";

import { useActionState, useState } from "react";

import { deleteBookingAction, type DeleteBookingState } from "@/app/bookings/actions";

/**
 * Two-step delete: the first button asks for confirmation inline, the second
 * submits. Avoids a blocking browser dialog while still requiring a deliberate action.
 */
export function DeleteBookingButton({ bookingId, description }: { bookingId: number; description: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteBookingState>(() => deleteBookingAction(bookingId), {
    message: null,
  });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
      >
        Delete booking
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full rounded-md border border-red-300 bg-red-50 p-4" aria-busy={pending}>
      <p id="delete-confirm-text" className="text-sm text-red-900">
        Permanently delete {description}? This cannot be undone.
      </p>
      {state.message && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-800">
          {state.message}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-describedby="delete-confirm-text"
          className="inline-flex justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-400"
        >
          {pending ? "Deleting…" : "Yes, delete booking"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Keep booking
        </button>
      </div>
    </form>
  );
}
