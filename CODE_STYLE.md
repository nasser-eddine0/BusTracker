# Coding Conventions

Observed source conventions as of 2026-10-13, with recommendations explicitly marked. Related: [AGENTS.md](AGENTS.md), [API.md](API.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md).

## Backend

PSR-4 App namespace maps to bus-backend/app. Classes are PascalCase; methods/variables camelCase; database fields snake_case. PHP files usually use four-space indentation, imports, typed method signatures and JsonResponse return types. Some legacy indentation and import ordering vary; no strict_types convention is established. Pint is installed, but no project formatting script was verified.

Controllers live under Http/Controllers/Api, with SuperAdmin and SchoolAdmin subnamespaces. They commonly validate inline, use Eloquent or DB transactions, call existing services and serialize responses privately. Services isolate Firebase, notification broadcasting, audit logging and admin-recipient lookup. Do not invent repository/service layers solely for stylistic symmetry.

Models use fillable, casts(), typed relationships and traits. Tenant ownership uses BelongsToSchool; core entities also use SoftDeletes. Explicit school predicates remain important for bulk operations and raw queries. Migration filenames encode ordering and use anonymous classes with up/down. MySQL-specific enum logic checks connection type.

Validation uses `$request->validate`, `Rule::in`, `Rule::unique(...)->ignore(...)`, and tenant-filtered Rule::exists. Validate role/status as well as existence for relational assignments. Persist only selected validated fields. Never pass raw request arrays into models. Model scope is not a substitute for an ownership predicate in unscoped code.

## Frontend

JavaScript/JSX ES modules, functional React components, hooks and PascalCase component files are standard. API functions live in src/api; shared authentication/realtime state in src/context; domain views/components under src/pages/{role}. Context objects are sometimes separated to support Fast Refresh. Page entry wrappers coexist with modular domain pages; check route imports before calling a file dead.

Most app JSX uses double quotes, semicolons and two-space indentation; scaffold/config files vary. Preserve surrounding style. Tailwind utilities coexist with index.css/App.css and Leaflet CSS. Use existing React Icons and UI components when extending this UI. User-visible copy uses the language context where available, but hardcoded English/French still exists.

UseEffect subscriptions typically return cleanup functions; data transforms use useMemo/useCallback where already appropriate. Several operations use optimistic state with rollback. Recommendation: ensure every async result belongs to the current user/school/trip before applying it and represent request errors explicitly. Do not assume existing effects already satisfy this.

## API and Errors

DB names are snake_case while public JSON often uses camelCase and string IDs. Exceptions include student_id/final_location payloads and billing/super-admin fields. Collections are commonly dictionaries keyed by string ID, with some arrays and raw Eloquent objects. Missing IDs vary between null and empty string. Preserve these contracts until a coordinated API/frontend change is requested; see API.md.

Validation failures rely on Laravel JSON errors; controllers use explicit business messages/statuses. Firebase projection helpers log wrapped exceptions; they do not currently provide durable recovery. Frontend error patterns vary (toast, console, ignored transport errors). Recommendation: reuse a proven error path, preserve business success after external projection failure, and make recovery observable; do not silently generalize catches across business writes.

## Types, Comments, Reuse and Dependencies

There is no TypeScript compiler or verified PHP static-analysis configuration. PHP annotations and runtime validation complement some type hints; JavaScript relies on runtime contracts. Document nullability and serialized IDs at boundaries.

Comments should explain constraints, ownership or non-obvious failure handling, not narrate assignments. Existing multilingual comments and legacy terminology are not proof of behavior. Prefer small changes over normalizing entire files. Duplicate serializers/helpers exist; consolidate only when it reduces demonstrated maintenance or correctness risk and preserves role-specific fields.

Manage backend dependencies with Composer and SPA dependencies with its package.json/lock. Root NPM scripts are proxies. Do not install/update dependencies or change lockfiles during documentation/audits. Check compatibility and advisories when a dependency change is authorized.

Security-sensitive edits require tenant/role/failure tests. Never commit .env, service accounts, tokens or generated passwords. Review raw HTML, URL handling, imported data and external responses at trust boundaries. Run focused tests plus appropriate build/lint checks as described in TESTING.md; report failures without unrelated auto-fixes.
