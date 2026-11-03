export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

/** A booking as returned by the Laravel API. Date-times are ISO 8601 UTC. */
export interface Booking {
  id: number;
  customer_name: string;
  customer_email: string;
  rego: string;
  service_bay: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Payload for creating or replacing a booking. Date-times are ISO 8601. */
export interface BookingInput {
  customer_name: string;
  customer_email: string;
  rego: string;
  service_bay: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus | string;
  notes: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export type FieldErrors = Record<string, string[]>;
