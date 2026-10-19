# BusTracker Agent Guide

## Project and Navigation

BusTracker is an existing multi-tenant school transport application aimed at Moroccan private schools. Inspect source before changing behavior; README claims and remediation plans are not proof of implementation.

- Backend: PHP 8.2+, Laravel 12, Sanctum 4, Eloquent, PHPUnit 11; Firebase Admin SDK, Laravel Excel, Stripe SDK.
- Frontend: JavaScript/JSX, React 19, Vite 8, Router 7, Axios, Firebase, Leaflet, Tailwind 4, React Icons.
- Backend entry points: `bus-backend/routes/api.php`, `bootstrap/app.php`, `app/Http/Controllers/Api`, `app/Http/Middleware`.
- Domain: `app/Models`, `app/Traits/BelongsToSchool.php`, `app/Services`, `app/Imports`, `database/migrations`, `tests`.
- Frontend: `bus-frontend/src/main.jsx`, `src/App.jsx`, `src/api`, `src/context`, `src/hooks`, `src/pages/{admin,driver,parent}`.
- Root `database.rules.json` governs Firebase client access; root NPM commands proxy to the frontend.

## Working Rules

1. Inspect relevant callers, middleware, models, schema, and frontend consumers before editing. Verify routed code rather than inferring behavior from names.
2. Inspect Git status and the relevant diff first. Preserve uncommitted work, including untracked files. Never reset, overwrite, delete, or commit it without authorization.
3. Make requested, targeted changes. Avoid architecture changes or refactoring for style. Audits remain read-only unless fixes are explicitly requested.
4. Prefer existing controllers, serializers, services, API wrappers, and hooks. Preserve string IDs, keyed dictionaries, endpoint names, and response differences.
5. Relational data owns business state; Firebase is a projection. Current paths are `active_trips/{schoolId}/{tripId}` and `active_buses/{schoolId}/{busId}`. The unfinished retry job is not wired into requests.
6. Avoid `.env`, service-account files, dependency/build/cache directories, runtime logs, and static assets unless needed. Never print or commit secrets, tokens, generated passwords, or student records.

## Security and Data Invariants

- Preserve `school_id` scoping, ownership middleware, and tenant-constrained validation. Raw queries and unauthenticated jobs require explicit school predicates.
- `BelongsToSchool` depends on authenticated context; it does not enforce tenancy in jobs or database constraints. Review every scope bypass, especially child linking.
- Roles are `super_admin`, `admin`, `driver`, and `parent`. Client guards are not API authorization. Check account, school, and subscription eligibility where required.
- Drivers act on assigned buses/trips; parents act on linked children. Validate coordinate ranges and student-to-bus membership.
- Firebase client writes are denied. Review read granularity and membership revocation when changing authorization.
- Preserve Stripe signature verification and event deduplication; duplicate suppression does not imply failed-event recovery.
- Preserve transactions and foreign keys. Never migrate an unknown database. Soft deletion is not erasure.
- Browser localStorage already holds bearer tokens; do not add sensitive data there.

## Verification

Backend: `php artisan test`; syntax: `php -l <file>`; frontend: `npm run build`, `npm run lint`. Read [TESTING.md](TESTING.md) first. Tests use SQLite memory and execute migrations; respect task-specific prohibitions. Never use formatter write flags during audits. Add focused regressions for tenant/security/state/failure changes. Report actual results; mocks do not verify live Firebase rules or MySQL concurrency.

## Documentation Maintenance

Update only documentation relevant to the actual change.

| Change | Document |
| --- | --- |
| Architecture and integrations | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Schema, constraints, deletion | [DATABASE.md](DATABASE.md) |
| Authentication, authorization, privacy | [SECURITY.md](SECURITY.md) |
| Domain rules and transitions | [BUSINESS_RULES.md](BUSINESS_RULES.md) |
| Endpoints and contracts | [API.md](API.md) |
| Tests and verification | [TESTING.md](TESTING.md) |
| Coding patterns | [CODE_STYLE.md](CODE_STYLE.md) |
| Product scope | [PRD.md](PRD.md) |
