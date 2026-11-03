"use client";

import Link from "next/link";
import { useActionState } from "react";

import { BOOKING_FIELDS, initialFormState, type BookingFormState, type BookingFormValues } from "@/lib/booking-form";
import { STATUS_LABELS } from "@/lib/status";
import { BOOKING_STATUSES } from "@/lib/types";

type Action = (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;

interface BookingFormProps {
  action: Action;
  initialValues: BookingFormValues;
  serviceBays: string[];
  timezone: string;
  submitLabel: string;
  cancelHref: string;
}

const inputClass =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 " +
  "aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/20 disabled:bg-slate-100";

export function BookingForm({ action, initialValues, serviceBays, timezone, submitLabel, cancelHref }: BookingFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState(initialValues));
  const { values, errors } = state;

  const errorFor = (field: string) => errors[field]?.[0];
  const unplacedErrors = Object.entries(errors)
    .filter(([field]) => !(BOOKING_FIELDS as readonly string[]).includes(field))
    .flatMap(([, messages]) => messages);

  const bays = values.service_bay && !serviceBays.includes(values.service_bay) ? [...serviceBays, values.service_bay] : serviceBays;

  const field = (name: keyof BookingFormValues, hasHint = false) => {
    const error = errorFor(name);
    const describedBy = [hasHint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(" ");

    return {
      id: name,
      name,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy || undefined,
    };
  };

  return (
    // Remount after each failed submission so inputs show exactly what was submitted.
    <form key={state.submission} action={formAction} noValidate className="space-y-6" aria-busy={pending}>
      {state.message && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">{state.message}</p>
          {unplacedErrors.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {unplacedErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {state.notFound && (
            <p className="mt-2">
              <Link href="/bookings" className="font-medium underline">
                Back to bookings
              </Link>
            </p>
          )}
        </div>
      )}

      <fieldset className="space-y-4" disabled={pending}>
        <legend className="text-base font-semibold text-slate-900">Customer</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" name="customer_name" error={errorFor("customer_name")}>
            <input {...field("customer_name")} type="text" required maxLength={255} autoComplete="off" defaultValue={values.customer_name} className={inputClass} />
          </Field>
          <Field label="Customer email" name="customer_email" error={errorFor("customer_email")}>
            <input {...field("customer_email")} type="email" required maxLength={255} autoComplete="off" defaultValue={values.customer_email} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={pending}>
        <legend className="text-base font-semibold text-slate-900">Caravan and bay</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration (rego)" name="rego" error={errorFor("rego")} hint="Saved in uppercase.">
            <input {...field("rego", true)} type="text" required maxLength={20} autoComplete="off" defaultValue={values.rego} className={`${inputClass} uppercase`} />
          </Field>
          <Field label="Service bay" name="service_bay" error={errorFor("service_bay")}>
            <select {...field("service_bay")} required defaultValue={values.service_bay} className={inputClass}>
              <option value="" disabled>
                Select a bay
              </option>
              {bays.map((bay) => (
                <option key={bay} value={bay}>
                  {serviceBays.includes(bay) ? bay : `${bay} (no longer configured)`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={pending}>
        <legend className="text-base font-semibold text-slate-900">Schedule</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" name="starts_at" error={errorFor("starts_at")} hint={`Workshop time (${timezone}).`}>
            <input {...field("starts_at", true)} type="datetime-local" required defaultValue={values.starts_at} className={inputClass} />
          </Field>
          <Field label="Ends" name="ends_at" error={errorFor("ends_at")} hint="Must be after the start.">
            <input {...field("ends_at", true)} type="datetime-local" required defaultValue={values.ends_at} className={inputClass} />
          </Field>
        </div>
        <Field label="Status" name="status" error={errorFor("status")}>
          <select {...field("status")} required defaultValue={values.status} className={`${inputClass} sm:max-w-xs`}>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="space-y-4" disabled={pending}>
        <legend className="text-base font-semibold text-slate-900">Notes</legend>
        <Field label="Notes (optional)" name="notes" error={errorFor("notes")} hint="Up to 2,000 characters.">
          <textarea {...field("notes", true)} rows={4} maxLength={2000} defaultValue={values.notes} className={inputClass} />
        </Field>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
