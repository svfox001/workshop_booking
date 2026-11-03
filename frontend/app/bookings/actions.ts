"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ApiNotFoundError,
  ApiUnavailableError,
  ApiValidationError,
  createBooking,
  deleteBooking,
  updateBooking,
} from "@/lib/api";
import { BOOKING_FIELDS, type BookingFormState, type BookingFormValues } from "@/lib/booking-form";
import { fromDateTimeLocal } from "@/lib/time";
import type { Booking, BookingInput } from "@/lib/types";

function readValues(formData: FormData): BookingFormValues {
  return Object.fromEntries(
    BOOKING_FIELDS.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  ) as unknown as BookingFormValues;
}

function toInput(values: BookingFormValues): BookingInput {
  return {
    customer_name: values.customer_name,
    customer_email: values.customer_email,
    rego: values.rego,
    service_bay: values.service_bay,
    starts_at: fromDateTimeLocal(values.starts_at),
    ends_at: fromDateTimeLocal(values.ends_at),
    status: values.status,
    notes: values.notes.trim() === "" ? null : values.notes,
  };
}

function failure(previous: BookingFormState, values: BookingFormValues, error: unknown): BookingFormState {
  const base = { values, errors: {}, message: null, notFound: false, submission: previous.submission + 1 };

  if (error instanceof ApiValidationError) {
    return {
      ...base,
      errors: error.errors,
      message:
        error.status === 409
          ? "This service bay is already booked for part of that time."
          : "Please correct the highlighted fields.",
    };
  }

  if (error instanceof ApiNotFoundError) {
    return { ...base, notFound: true, message: "This booking no longer exists. It may have been deleted by someone else." };
  }

  if (error instanceof ApiUnavailableError && error.status === 503) {
    return { ...base, message: "The booking schedule is busy right now. Please try again in a moment." };
  }

  console.error("Saving booking failed", error);

  return {
    ...base,
    message: "The booking could not be saved because the booking service is unavailable. Please try again.",
  };
}

function revalidateBooking(id: number) {
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath(`/bookings/${id}/edit`);
}

export async function createBookingAction(previous: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const values = readValues(formData);
  let booking: Booking;

  try {
    booking = await createBooking(toInput(values));
  } catch (error) {
    return failure(previous, values, error);
  }

  revalidateBooking(booking.id);
  redirect(`/bookings/${booking.id}?notice=created`);
}

export async function updateBookingAction(
  id: number,
  previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = readValues(formData);

  try {
    await updateBooking(id, toInput(values));
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      revalidateBooking(id);
    }
    return failure(previous, values, error);
  }

  revalidateBooking(id);
  redirect(`/bookings/${id}?notice=updated`);
}

export interface DeleteBookingState {
  message: string | null;
}

export async function deleteBookingAction(id: number): Promise<DeleteBookingState> {
  let notice = "deleted";

  try {
    await deleteBooking(id);
  } catch (error) {
    if (!(error instanceof ApiNotFoundError)) {
      console.error("Deleting booking failed", error);
      return { message: "The booking could not be deleted because the booking service is unavailable. Please try again." };
    }
    // Someone else already deleted it; the outcome the user wanted has happened.
    notice = "already-deleted";
  }

  revalidateBooking(id);
  redirect(`/bookings?notice=${notice}`);
}
