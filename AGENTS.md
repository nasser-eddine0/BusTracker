# AGENTS.md

## Project Overview
- School bus tracking SaaS: Laravel API backend + React/Vite SPA frontend.
- Users: `super_admin` manages schools/admins; school `admin` manages fleet/users/students/billing; `driver` runs trips/attendance/location; `parent` links children, tracks bus, confirms location, declares ready/absence.
- Realtime bus state uses Firebase Realtime Database; app notifications are DB-backed and optionally pushed through a local WebSocket command.

## Architecture
- `bus-backend/`: Laravel 12 API, Sanctum bearer-token auth, MySQL in dev, PHPUnit tests with SQLite memory.
- `bus-frontend/`: React 19 SPA, React Router, Axios API client, Firebase RTDB listeners, Leaflet maps, Tailwind/Vite CSS.
- Root `package.json` only proxies frontend commands. Backend has its own Composer/NPM setup.

## Important Technologies
- Backend: PHP 8.2+, Laravel 12, Sanctum, Eloquent, queues/database cache, `maatwebsite/excel`, `kreait/firebase-php`, `stripe/stripe-php`.
- Frontend: Vite 8, React 19, React Router 7, Axios, Firebase JS SDK, Leaflet/React-Leaflet, Framer Motion, react-hot-toast, Chart.js/Recharts.

## Important Directories
- Backend routes/controllers: `bus-backend/routes/api.php`, `app/Http/Controllers/Api/**`.
- Backend domain: `app/Models`, `app/Http/Middleware`, `app/Services`, `app/Imports`, `database/migrations`, `tests`.
- Frontend routes/state/API: `bus-frontend/src/App.jsx`, `src/context`, `src/api`, `src/hooks`, `src/pages/{admin,driver,parent}`.
- Firebase rules: root `database.rules.json`.

## Data / Business Rules
- Main models: `School`, `User`, `Bus`, `Student`, `Trip`, `Presence`, `Notification`, `AuditLog`.
- Tenant data (`Bus`, `Student`, `Trip`, `Presence`, `Notification`, `User`) is scoped by `school_id`; `BelongsToSchool` adds a global scope for authenticated non-super-admin users and auto-fills `school_id` on create.
- Relationships: School has users; User has one driven bus and many children; Bus belongs to driver and has students/trips/activeTrip; Student belongs to parent and bus; Trip belongs to bus/driver and has presences/notifications.
- One bus has at most one driver (`buses.driver_id` unique). Reassigning drivers clears previous bus assignments.
- Bus capacity is enforced when assigning students.
- Student statuses include `waiting`, `ready`, `mounted`, `in_bus`, `absent`, `dropped`; trip statuses include `in_progress`, `completed`; trip types include `aller`/`retour` and legacy `pickup`.
- Starting a trip completes stale active trips, resets bus students to `waiting`, creates presence rows, sets bus `trip_status=in_progress`, writes Firebase `active_trips/{schoolId}/{busId}`.
- Location pings require the authenticated driver's active trip and valid coordinates; proximity alerts fire once per trip/student at 2000m and 50m via cache.
- Finalizing a trip upserts attendance, marks trip/bus completed, updates final bus coordinates, and removes Firebase active trip.
- Parent `link-child` uses `reg_code`, may assign parent `school_id` if null, rejects cross-school/multiple-parent links, and checks school active/subscribed.
- Parent absence updates student/presence and notifies driver + school admins; parent ready notifies driver.

## Authentication / Authorization
- Auth endpoints: `POST /api/register`, `POST /api/login`, `GET /api/me`, `POST /api/logout`.
- Auth uses Sanctum personal access tokens stored client-side in `localStorage` as `token`; frontend also caches `auth_user`.
- Login optionally validates selected role; disabled users cannot login/access role routes.
- Route middleware: `auth:sanctum`, `role:*`, `school.owner`, `school.active`, `subscription.active`, `super_admin`, `throttle.role`.
- `super_admin` has no school and can manage schools/admins/audit logs. School admins use role string `admin`; legacy enum mentions `school_admin` but routes use `admin`.
- Active school + active/trial/grace subscription are required for admin/driver/parent business routes, except parent child-link flow allows initial null `school_id`.

## API Structure
- Super admin: `/api/super-admin/schools`, `/admins`, `/audit-logs`, school status/admin management.
- Admin: `/api/admin/bootstrap`, user/student/bus CRUD, bulk deletes, student import, assignments.
- Billing: `/api/admin/billing/status|subscribe|portal`; Stripe webhook at unauthenticated `POST /api/stripe/webhook`.
- Driver: `/api/driver/dashboard`, `/trip/start`, `/trip/nudge-parent`, `/students/{student}/status`, notifications; `POST /api/driver/trip/ping-location` is separately throttled.
- Parent: `/api/parent/dashboard`, `/link-child`, `/absence`, `/ready`, `/confirm-location`, notifications.
- Chat: authenticated `POST /api/chat`.

## External Services
- Firebase Admin SDK backend config: `FIREBASE_DATABASE_URL`, `FIREBASE_CREDENTIALS`; frontend requires `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`.
- Firebase RTDB paths observed by frontend: `active_trips/{schoolId}`; rules also define `school_users`, `bus_locations`, `notifications`.
- Stripe billing requires `STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`; webhook signatures are mandatory and duplicate event IDs are ignored.
- Chat config exists for xAI: `XAI_API_KEY`, `XAI_BASE_URL`, `XAI_MODEL`.
- Notification WebSocket command: `php artisan notifications:serve --host=127.0.0.1 --port=8081`; frontend uses `VITE_NOTIFICATIONS_WS_URL`.

## Development / Test / Build Commands
- Backend install/setup: `cd bus-backend && composer install && npm install && cp .env.example .env && php artisan key:generate && php artisan migrate`.
- Backend dev: `cd bus-backend && composer run dev` or `php artisan serve`; notification WS separately with `php artisan notifications:serve`.
- Backend tests: `cd bus-backend && php artisan test` or `composer test`.
- Backend lint/syntax: `php -l path/to/file.php`; Pint is installed but no root script was verified.
- Frontend dev/build/lint: root `npm run dev|build|lint|preview` proxies to `bus-frontend`; or run inside `bus-frontend`.

## Coding Conventions
- Preserve existing API response shape: many IDs are serialized as strings and frontend dictionaries are keyed by string IDs.
- Prefer existing controllers/services/helpers over new abstractions. Keep changes small and role/tenant-aware.
- Backend uses request validation heavily; add tenant-constrained `Rule::exists(...)->where('school_id', ...)` for tenant-owned IDs.
- Keep frontend API calls in `src/api/*`, auth in `AuthContext`, realtime Firebase listeners in `context/hooks`.
- Do not assume README is current when code disagrees; verify in routes/controllers/models.

## Security Rules
- Never bypass `school_id` tenant checks, `school.owner`, role middleware, or Firebase path scoping.
- Do not log or commit secrets, Firebase service account JSON, Sanctum tokens, Stripe keys, webhook payload secrets, or generated passwords.
- Stripe webhooks must keep signature verification and idempotency via `stripe_webhook_logs`.
- Validate lat/lng ranges and route model ownership before mutating trips, buses, students, notifications, or presences.
- Be cautious with parent linking by `reg_code`, cross-school checks, and nullable parent `school_id`.
- Treat `localStorage` token handling as existing behavior, not a place to add sensitive data.

## Avoid Inspecting Unless Needed
- Dependencies/build/cache: `vendor/`, `node_modules/`, `bus-frontend/dist/`, `bus-backend/bootstrap/cache/`, `bus-backend/storage/framework/`, `bus-backend/storage/logs/`.
- Generated/runtime: `bus-backend/storage/app/notification-broadcasts.log`, uploaded temp files, Firebase credentials, `.env`.
- Static assets unless UI work requires them: `bus-frontend/public/`, `bus-frontend/src/assets/`.

## Codex Rules For This Repo
- Inspect existing code before changing it; do not invent architecture or behavior.
- Do not modify files unless explicitly requested; for this repo guide, only edit root `AGENTS.md`.
- Verify cross-file dependencies before declaring code broken, unused, or safe to remove.
- Distinguish confirmed problems from assumptions; do not report stylistic preferences as bugs.
- Prefer minimal, targeted changes and do not rewrite working code unnecessarily.
- For audits, prioritize security, tenant isolation, data integrity, correctness, and production reliability.
- Avoid unnecessary repository-wide rereading; start from `routes/api.php`, relevant controller/model/middleware, then the matching frontend API/context/page.
- Ignore generated/dependency directories unless specifically needed.
- Keep responses concise and actionable; do not explain correct code unless asked.
