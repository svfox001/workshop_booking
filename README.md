# Workshop Bookings

A workshop bookings system for a caravan dealership. Staff create, view, edit, filter and delete caravan service bookings and assign each booking to a service bay. The system guarantees that two active bookings never overlap in the same bay, including when two people book the same slot at the same moment.

## Overview

```
.
├── backend/    Laravel 13 REST API (PHP 8.3, SQLite, Pest)
├── frontend/   Next.js 16 App Router app (React 19, TypeScript, Tailwind CSS 4)
└── README.md
```

**Backend (`backend/`)**

| Piece | Location |
| --- | --- |
| Routes | `routes/api.php` |
| Controllers (thin) | `app/Http/Controllers/Api/BookingController.php`, `ServiceBayController.php` |
| Validation | `app/Http/Requests/StoreBookingRequest.php`, `UpdateBookingRequest.php`, `IndexBookingsRequest.php` |
| Booking writes, bay locks, conflict check | `app/Services/BookingService.php` |
| Time parsing and UTC normalisation | `app/Support/WorkshopTime.php`, `app/Rules/Iso8601DateTime.php` |
| Status enum | `app/Enums/BookingStatus.php` |
| Responses | `app/Http/Resources/BookingResource.php` |
| 409 / 503 responses | `app/Exceptions/BookingConflictException.php`, `BookingLockTimeoutException.php` |
| JSON errors and 404 messages | `bootstrap/app.php` |
| Bays, timezone | `config/workshop.php` |
| Schema | `database/migrations/2026_11_03_000000_create_bookings_table.php` |
| Tests | `tests/Feature/*`, `tests/Concurrency/*` |

API:

| Method and path | Purpose | Success |
| --- | --- | --- |
| `GET /api/bookings?status=&page=&per_page=` | Paginated list, `starts_at` desc then `id` desc | 200 |
| `POST /api/bookings` | Create | 201 |
| `GET /api/bookings/{id}` | Retrieve | 200 |
| `PUT /api/bookings/{id}` | Replace (all required fields plus `status`) | 200 |
| `DELETE /api/bookings/{id}` | Permanently delete | 204 |
| `GET /api/service-bays` | Configured bays, `{ "data": ["Bay 1", ...] }` | 200 |

Errors are always JSON under `/api/*`: 422 `{message, errors}`, 404 `{message}`, 409 `{message, errors: {starts_at: [...]}}`, 503 `{message}` with `Retry-After`.

**Frontend (`frontend/`)**

| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/bookings` |
| `/bookings` | List with status filter and pagination (`?status=confirmed&page=2`) |
| `/bookings/new` | Create form |
| `/bookings/[id]` | Detail, edit link, delete with inline confirmation |
| `/bookings/[id]/edit` | Edit form |

- `lib/api.ts` is the only module that talks to Laravel. It imports `server-only`, reads `API_BASE_URL` (no `NEXT_PUBLIC_` prefix), and fetches with `cache: 'no-store'`. The browser never calls Laravel.
- Pages are Server Components. Client Components are limited to the form (`components/BookingForm.tsx`), the delete button (`components/DeleteBookingButton.tsx`) and `error.tsx`.
- Mutations are Server Actions in `app/bookings/actions.ts`, used with `useActionState`.
- `lib/time.ts` formats and parses all times in the workshop timezone on the server, so output does not depend on the server's or browser's timezone and there is nothing to mismatch during hydration.

**Caching and revalidation.** Booking data is operational: a stale schedule can put two caravans in one bay. So nothing about bookings is cached. Every API call uses `cache: 'no-store'`, and every booking route renders per request. After a create, update or delete, the Server Action calls `revalidatePath` for the list and the affected detail and edit pages, then redirects, so the client router never shows a pre-mutation page. I turned off Next 16's Cache Components because these pages have no useful static shell, and with it on, a form submitted before hydration rendered a blank page. The cost is a round-trip to Laravel on every page view, which is negligible for a staff tool. If load ever mattered, I would cache the service bay list (which rarely changes) before touching booking data.

**Simultaneous bookings.** A validation query alone races: two requests both see a free slot and both insert. Each write therefore runs in a transaction whose first statement upserts that bay's row in `service_bay_locks`. That takes the write lock (SQLite) or an exclusive row lock (MySQL/PostgreSQL) before anything is read. The overlap check (`existing.starts_at < new.ends_at AND existing.ends_at > new.starts_at`, active statuses only, excluding the booking itself) then runs while the lock is held, and the second request waits and gets a 409. Lock timeouts return 503 with `Retry-After`. A test with 8 separate PHP processes stores exactly one booking. With the lock removed, it fails every time.

**At 200 dealers, what I'd change first.** Tenant isolation, which depends on authentication. I would add auth, derive `company_id` from the logged-in user (never from the request), and scope every query, bay and lock by company with a global scope plus policies. Then I would move to PostgreSQL. SQLite serialises every write across all dealers on one host. PostgreSQL gives per-bay row locks and an exclusion constraint that enforces "no overlap" in the database itself, not only in the service. The fuller design is under [Multi-tenancy](#multi-tenancy-design-only-not-implemented).

## Setup

Requirements: PHP 8.3+ with `pdo_sqlite`, Composer 2, Node.js 20.9+ (tested with 24.20) and npm. No Docker or external services.

Commands are for a POSIX shell (Git Bash on Windows works). PowerShell equivalents are noted where they differ.

```bash
git clone <repository-url> workshop-bookings
cd workshop-bookings
```

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env                 # PowerShell: Copy-Item .env.example .env
php artisan key:generate
touch database/database.sqlite       # PowerShell: New-Item database/database.sqlite
php artisan migrate
```

SQLite runs with `journal_mode=wal`, `busy_timeout=5000` and `synchronous=normal` (set in `.env` and applied by `config/database.php` on every connection). The database file is `backend/database/database.sqlite` unless `DB_DATABASE` is set.

### 2. Frontend

```bash
cd ../frontend
npm ci
cp .env.example .env.local           # PowerShell: Copy-Item .env.example .env.local
```

`.env.local` holds `API_BASE_URL=http://127.0.0.1:8000/api` and `WORKSHOP_TIMEZONE=Australia/Sydney`. Keep `WORKSHOP_TIMEZONE` the same as the backend's.

### 3. Run both apps

Terminal 1:

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

Terminal 2 (production build):

```bash
cd frontend
npm run build
npm run start                        # http://localhost:3000
```

For development, use `npm run dev` instead of `build` and `start`.

### 4. Tests and checks

```bash
cd backend
php vendor/bin/pest                  # all tests (Feature + Concurrency)
php vendor/bin/pest tests/Concurrency
php vendor/bin/pint --test           # code style

cd ../frontend
npm run lint
npm run typecheck                    # next typegen && tsc --noEmit
npm run build                        # succeeds without Laravel running
```

Feature tests use in-memory SQLite. The concurrency tests create their own temporary file database under `backend/storage/framework/testing/` and delete it afterwards.

## Assumptions

- **Versions.** The machine had PHP 8.3.32, Composer 2.4.1, Node 24.20 (plus an older Node 18.8 on the Git Bash path, which is too old for current Next.js) and npm 11. That gave Laravel 13 (13.39) and Next.js 16.4.4 with React 19.
- **`PUT` requires `status`.** `PUT` replaces the whole booking, so a missing `status` is a 422 rather than defaulting to `pending`. Defaulting would silently reactivate cancelled bookings. `notes` may be omitted and is then cleared. `PATCH` is not routed (405).
- **`per_page` outside 1 to 100, and `page` below 1, return 422** rather than being clamped. The frontend never sends invalid values: it falls back to page 1 and ignores unknown statuses with a visible notice.
- **Accepted date-time format.** ISO 8601 with a `T` or space separator, minutes or seconds, an optional fraction, and an optional `Z` or `±HH:MM`/`±HHMM` offset (for example `2026-11-10T09:00`, `2026-11-10T09:00:00+11:00`, `2026-11-09T22:00:00Z`). Date-only values and natural language such as `tomorrow` are rejected. Fractions of a second are dropped, so stored values are `Y-m-d H:i:s` in UTC.
- **Daylight-saving edges.** A local time that does not exist (for example 02:30 on the day clocks go forward) is moved forward by PHP's normal rules. An ambiguous local time when clocks go back resolves to PHP's default. Staff who need a specific instant can send an explicit offset.
- **The frontend sends UTC.** Server Actions convert `datetime-local` values from the frontend's `WORKSHOP_TIMEZONE` to UTC before calling the API, so editing round-trips exactly even if the two settings differ. Both settings default to `Australia/Sydney`.
- **Service bays** come from `config/workshop.php` and can be overridden with `WORKSHOP_SERVICE_BAYS="Bay 1,Bay 2,..."`. Bay names match exactly (case-sensitive). If a bay is removed from config, existing bookings keep it and remain viewable, but must be moved to a configured bay when they are next edited.
- **`GET /api/service-bays`** returns a plain array of names in `data`.
- **Rego** is trimmed and uppercased (internal spaces are kept). The 20-character limit applies after trimming. The model mutator applies the same normalisation to writes that bypass the request.
- **Email** uses Laravel's default `email` rule (RFC).
- **Success messages** use a whitelisted `?notice=` query parameter (`created`, `updated`, `deleted`, `already-deleted`) after a redirect. No toast library, no cookies.
- **Delete confirmation** is an inline two-step button ("Delete booking", then "Yes, delete booking" or "Keep booking") instead of `window.confirm`.
- **Deleting** a booking that someone else already deleted is treated as success, with a notice. Saving an edit to a booking that someone else deleted shows the not-found page.
- **Cache Components is off.** `create-next-app` 16.4 enabled `cacheComponents` and `partialPrefetching`. With them on, a form submitted before hydration (or without JavaScript) returned the action's streamed chunks without the page shell, which rendered a blank page. Every page here is request-time data anyway, so plain dynamic rendering is used. With it off, the same no-JavaScript submission renders the full page with field errors.
- **`loading.tsx` covers only the list** (`app/bookings/(list)/`). Detail and edit pages are not wrapped in a streaming boundary, so a missing booking returns a real HTTP 404 instead of a streamed 200.
- **CORS is disabled.** Laravel's default global `HandleCors` middleware (which sent `Access-Control-Allow-Origin: *`) is removed. Only the Next.js server calls the API, and this stops any website open in a staff browser from reading the unauthenticated local API.
- **Fonts.** The scaffold's Google Fonts were replaced with a system font stack, so builds do not need network access.
- **Kept from the scaffold.** Laravel's default `users`, `cache` and `jobs` migrations are unused but kept as framework defaults. No seeders are provided.
- **Timeouts.** The SQLite busy timeout (5 s) is the lock wait. The client is asked to retry after 2 s (`WORKSHOP_LOCK_RETRY_AFTER`). The Next.js API client times out after 10 s.

## Caching and revalidation

- **Not cached:** all booking and service bay data. Every API call in `lib/api.ts` uses `fetch(..., { cache: 'no-store' })` and first awaits `connection()`, so nothing is fetched at build time or served from the Data Cache. Every booking route is dynamic (`ƒ` in the build output), and `next build` makes no API calls, which is why it succeeds with Laravel stopped.
- **Static:** only the `/` redirect and the framework's not-found page.
- **Laravel** caches nothing for bookings. Responses are generated per request.
- **After a mutation:** each successful Server Action calls `revalidatePath('/bookings')`, `revalidatePath('/bookings/{id}')` and `revalidatePath('/bookings/{id}/edit')`, then redirects. With `no-store` there is no server cache to purge, so the practical effect is clearing the client Router Cache, so the list and detail pages show fresh data on the next visit and when navigating back.
- **Other staff's changes** appear on the next navigation or refresh. There is no live push.

## Concurrent bookings

### How the lock works

`BookingService` runs every create and update in a transaction that does this:

1. `BEGIN` (Laravel's default deferred transaction on SQLite).
2. As the **first statement**, upsert the bay's row in `service_bay_locks` (`INSERT ... ON CONFLICT(service_bay) DO UPDATE SET locked_at = ...`). The row is created if it does not exist. When an update moves a booking between bays, both bays are locked, in sorted order, so two opposite moves cannot deadlock.
3. While holding the lock, re-read the booking (for updates) and run the overlap query: same bay, status `pending` or `confirmed`, `existing.starts_at < requested.ends_at AND existing.ends_at > requested.starts_at`, excluding the booking's own ID. Bound values use the same UTC `Y-m-d H:i:s` text format as stored values, so SQLite's text comparison is chronological.
4. Save and commit.

The write must come first. On SQLite, a deferred transaction that reads first and writes later cannot wait for the write lock: it fails at once with `SQLITE_BUSY_SNAPSHOT` if another writer committed in between. A transaction whose first statement is a write takes the database's single write lock up front and waits on `busy_timeout`. On MySQL and PostgreSQL, the upsert takes an exclusive row lock that is held until commit, so writes are serialised per bay, and other bays proceed in parallel.

If the lock is not acquired within the timeout (`SQLITE_BUSY`/`SQLITE_LOCKED`, MySQL 1205, PostgreSQL `55P03`), the service throws `BookingLockTimeoutException`, which renders a 503 with `Retry-After`, not a 500. The frontend shows "The booking schedule is busy right now. Please try again in a moment."

An update first reads the booking's current bay outside the transaction (needed to know which bays to lock), then re-reads it under the lock. If another request moved it to a bay that was not locked in the meantime, the transaction is retried (up to 3 times) with the correct bays.

Deletes do not take a bay lock, because removing a booking can only free a slot.

### What is guaranteed

For every write made through `BookingService`, two `pending` or `confirmed` bookings in the same bay never overlap, even under concurrent requests. Cancelled bookings never block and are never blocked. Reactivating a cancelled booking, changing its bay, and changing its times all run the check.

### How it is tested

`tests/Concurrency/ConcurrentBookingTest.php` migrates a temporary **file-based** SQLite database (WAL mode), then starts 8 separate PHP processes (`tests/Concurrency/book-slot-worker.php`). Each process boots Laravel, opens its own connection, waits at a file-based barrier until all 8 are ready, then sends `POST /api/bookings` through the full HTTP kernel for the same bay and time (half with a local time, half with the same instant in UTC). The test asserts exactly one 201, seven 409s with `errors.starts_at`, every process exiting cleanly, and exactly one row stored. A second test confirms 4 concurrent bookings in different bays all succeed.

Results from this build:

| Variant | Result |
| --- | --- |
| With the lock (shipped code) | Passed on every run (9 runs, including a clean clone): one 201 and seven 409s |
| Lock step removed, transaction kept | Failed on 3 of 3 runs: one 201 and seven **503s**. Each process read "no conflict" in a deferred transaction, and the losers then failed to upgrade to a write lock (`SQLITE_BUSY_SNAPSHOT`) |
| Lock step and transaction removed | Failed on 3 of 3 runs: **eight 201s**, so eight overlapping bookings were stored |

The lock was restored and the full suite re-run afterwards.

### Limitations

- **Writes that bypass the service** (raw SQL, `Booking::create()` in Tinker, other applications, imports) skip both the lock and the check, and can create overlaps.
- **No database-level overlap constraint.** SQLite and MySQL cannot express "no overlapping ranges per bay" declaratively. PostgreSQL could, with an exclusion constraint (`EXCLUDE USING gist (service_bay WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled')`), which would be the right safety net if the app moves to PostgreSQL.
- **SQLite is single-writer and single-host.** All booking writes across all bays are serialised through one write lock, and the database file must sit on a local disk used by one machine. WAL mode does not work reliably on network filesystems. Fine for one dealership's workshop, not for many concurrent sites.
- **Last write wins** when two staff edit the same booking. Both forms load version A. The second save overwrites the first without warning, as long as the result does not overlap another booking. Optimistic locking (sending `updated_at` or a version column and returning 409 when it has changed) would fix this but is not implemented.
- **Lock rows are never removed.** There is one small row per bay ever used, including bays later removed from config.

## Multi-tenancy (design only, not implemented)

Goal: one deployment serving 200 dealerships, each seeing only its own bookings and bays.

**Data model.** Add `companies` (id, name, slug, timezone). Add a non-null `company_id` foreign key to `bookings`, `service_bay_locks` and a new `service_bays` table (`company_id`, `name`, `active`, unique on `(company_id, name)`). Bays move from `config/workshop.php` into this table, so each dealership manages its own, and the workshop timezone becomes a per-company setting. Bookings reference `service_bay_id`, which makes "Bay 1 at dealer A" and "Bay 1 at dealer B" different bays by construction.

**Deriving the tenant.** Add authentication first (for example Laravel Sanctum, with Next.js holding the session server-side). Users belong to a company (`users.company_id`, or a `company_user` pivot with a role if staff can work across sites). The tenant is always derived from the authenticated user on the server, never from a request parameter, header or subdomain chosen by the client. Middleware resolves the current company once per request into a scoped container binding.

**Scoping.** A `BelongsToCompany` trait adds a global scope (`where company_id = current company`) and sets `company_id` on create. Route model binding then returns 404 for another company's booking, so other tenants' IDs cannot even be confirmed to exist. Form Requests validate `service_bay_id` with `Rule::exists('service_bays','id')->where('company_id', $companyId)`. `BookingService` takes the company explicitly and includes it in the conflict query and the lock key, so it does not rely on the global scope alone.

**Authorization.** Policies (`BookingPolicy`) check `user->company_id === booking->company_id` and the user's role (for example, only managers can delete or manage bays). This is defence in depth on top of the scope. Admin and console paths that disable global scopes are explicit and audited.

**Indexes and locks.** Lead every index with `company_id`: `(company_id, service_bay_id, starts_at, ends_at, status)` for conflicts, and `(company_id, starts_at, id)` and `(company_id, status, starts_at, id)` for the list. Make `service_bay_locks` keyed by `(company_id, service_bay_id)`, or simply lock the `service_bays` row itself with `SELECT ... FOR UPDATE`. Lock order stays sorted by bay id.

**Database.** Move from SQLite to **PostgreSQL**. 200 dealerships writing concurrently cannot share SQLite's single writer or run on more than one app host. PostgreSQL gives row-level locks (writes serialised per bay, not globally), and a real overlap guarantee via an exclusion constraint on `(company_id, service_bay_id, tstzrange(starts_at, ends_at))` where status is active (needs `btree_gist`). Use a shared schema with a `company_id` column. 200 tenants does not justify database-per-tenant. PostgreSQL row-level security on `company_id` can be added as a further guard.

**Migrating existing data.** (1) Create `companies` and insert the current dealership. (2) Add nullable `company_id` columns and backfill them with that company. (3) Create `service_bays` rows from the configured names plus any distinct `bookings.service_bay` values, then backfill `service_bay_id`. (4) Make the columns non-null, add foreign keys and the new composite indexes, and drop the old string column and indexes. (5) Copy SQLite data into PostgreSQL with a one-off export/import, verify row counts and that no active overlaps exist, then switch over during a short maintenance window. Each step is a separate, reversible migration.

**Tests that prove isolation.** Factories create two companies, each with bays, users and bookings. Tests assert that a user from company A:

- gets 404 from `GET`, `PUT` and `DELETE` on company B's booking IDs
- never sees company B's bookings in the list, including totals and pagination
- cannot create or move a booking into company B's bay (422)
- can book "Bay 1" at the same time as company B's "Bay 1"

A concurrency test runs two companies booking the same bay name and time and expects both to succeed, while the existing same-company race still yields exactly one booking. A guard test checks that every tenant-owned model uses `BelongsToCompany`.

## Limitations

- **No authentication or authorization.** The API is unauthenticated and intended for local use only. Anyone who can reach port 8000 can read, change and delete every booking. Do not expose it on a network.
- Last-write-wins on concurrent edits of the same booking (see above).
- No database-level overlap constraint. Writes that bypass `BookingService` are unprotected.
- SQLite limits the system to one host and serialises all booking writes.
- Changes made by other staff appear on the next navigation or refresh, not live.
- The browser end-to-end check was done manually (Chrome, through browser automation), not as an automated browser test suite. There are no frontend unit tests. Behaviour is covered by the Pest API tests and the manual end-to-end run.
- The mobile layout was checked at 375 px width in an iframe, not on a physical device.
- `php artisan serve` runs one request at a time on Windows. It is fine for local use but is not a production server.
- `npm audit` reports 0 vulnerabilities in production dependencies and 16 moderate ones in the dev-only ESLint toolchain. These were not force-upgraded, because the fix is a breaking ESLint change.
- Only tested on Windows 11 (PHP 8.3.32, Node 24.20). The README commands are standard, but macOS and Linux were not run.
