import type { FieldErrors } from "./types";

/** Raw form values. Date-times are datetime-local strings in the workshop timezone. */
export interface BookingFormValues {
  customer_name: string;
  customer_email: string;
  rego: string;
  service_bay: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string;
}

export interface BookingFormState {
  values: BookingFormValues;
  errors: FieldErrors;
  /** Form-level message for failures that do not belong to a field. */
  message: string | null;
  /** Set when the booking was deleted by someone else while being edited. */
  notFound: boolean;
  /** Changes on each failed submission so the form remounts with the submitted values. */
  submission: number;
}

export const BOOKING_FIELDS = [
  "customer_name",
  "customer_email",
  "rego",
  "service_bay",
  "starts_at",
  "ends_at",
  "status",
  "notes",
] as const satisfies readonly (keyof BookingFormValues)[];

export const EMPTY_BOOKING_VALUES: BookingFormValues = {
  customer_name: "",
  customer_email: "",
  rego: "",
  service_bay: "",
  starts_at: "",
  ends_at: "",
  status: "pending",
  notes: "",
};

export function initialFormState(values: BookingFormValues): BookingFormState {
  return { values, errors: {}, message: null, notFound: false, submission: 0 };
}
