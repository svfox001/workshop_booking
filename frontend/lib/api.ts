import "server-only";

import { connection } from "next/server";

import type { Booking, BookingInput, BookingStatus, FieldErrors, PaginatedResponse } from "./types";

/**
 * The only module that talks to Laravel. It runs on the server, so the
 * browser never calls the API directly and API_BASE_URL is never exposed.
 */

const REQUEST_TIMEOUT_MS = 10_000;

function baseUrl(): string {
  return (process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api").replace(/\/+$/, "");
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 422 validation failures and 409 service bay conflicts, with per-field messages. */
export class ApiValidationError extends ApiError {
  constructor(
    message: string,
    status: number,
    readonly errors: FieldErrors,
  ) {
    super(message, status);
    this.name = "ApiValidationError";
  }
}

export class ApiNotFoundError extends ApiError {
  constructor(message = "Not found.") {
    super(message, 404);
    this.name = "ApiNotFoundError";
  }
}

/** Laravel could not be reached, timed out, or failed with a 5xx. */
export class ApiUnavailableError extends ApiError {
  constructor(
    message: string,
    status = 0,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message, status);
    this.name = "ApiUnavailableError";
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  // Booking data is operational: never read it during prerendering, only per request.
  await connection();

  let response: Response;

  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // Always read the current schedule; never serve a cached response.
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`Booking API request failed: ${init.method ?? "GET"} ${path}`, error);
    throw new ApiUnavailableError("The booking service could not be reached.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message : `Request failed with status ${response.status}.`;

  if (response.ok) {
    return body as T;
  }

  if (response.status === 404) {
    throw new ApiNotFoundError(message);
  }

  if (response.status === 422 || response.status === 409) {
    throw new ApiValidationError(message, response.status, normaliseErrors(body?.errors));
  }

  if (response.status >= 500) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    console.error(`Booking API responded ${response.status}: ${init.method ?? "GET"} ${path}`, message);
    throw new ApiUnavailableError(
      response.status === 503 ? message : "The booking service failed to process the request.",
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }

  throw new ApiError(message, response.status);
}

function normaliseErrors(errors: unknown): FieldErrors {
  if (!errors || typeof errors !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(errors as Record<string, unknown>).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages.map(String) : [String(messages)],
    ]),
  );
}

export interface ListBookingsParams {
  status?: BookingStatus;
  page?: number;
  perPage?: number;
}

export function listBookings({ status, page = 1, perPage = 15 }: ListBookingsParams = {}) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (status) {
    query.set("status", status);
  }

  return request<PaginatedResponse<Booking>>(`/bookings?${query}`);
}

/** Returns null when the booking does not exist (for example, deleted by someone else). */
export async function getBooking(id: number): Promise<Booking | null> {
  try {
    return (await request<{ data: Booking }>(`/bookings/${id}`)).data;
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  return (await request<{ data: Booking }>("/bookings", { method: "POST", body: input })).data;
}

export async function updateBooking(id: number, input: BookingInput): Promise<Booking> {
  return (await request<{ data: Booking }>(`/bookings/${id}`, { method: "PUT", body: input })).data;
}

export async function deleteBooking(id: number): Promise<void> {
  await request<void>(`/bookings/${id}`, { method: "DELETE" });
}

export async function getServiceBays(): Promise<string[]> {
  return (await request<{ data: string[] }>("/service-bays")).data;
}
