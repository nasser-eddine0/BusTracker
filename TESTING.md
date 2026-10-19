# Testing and Verification

## Super-Admin Console Verification (2026-10-15)

- Laravel suite: 68 tests passed, 256 assertions, using SQLite memory. Added disabled super-admin read/write denial and audit severity validation/filtering regressions.
- Frontend build passed; the large bundle warning remains. Targeted ESLint for SuperAdminDashboard.jsx passed. Full lint still fails with six existing errors in FloatingChatbot, AuthContext, useFirebaseActiveTrips, useFirebaseBusLocations, RoleSelect and UsersPage.
- PHP syntax checks passed for EnsureSuperAdmin, AuditLogController and SuperAdminAuditLogTest; git diff --check passed.
- Dialog closure, repeated submissions, stale audit responses, filter reset and mobile modal scrolling require browser regression coverage. Playwright is not installed in the project; no browser-pass claim is made.
- This verification does not establish live Firebase permissions, membership revocation, projection recovery or MySQL concurrency correctness.
- Mocked Firebase membership regressions cover SQL-first pending/success/failure state, bounded retry metadata, idempotent repeated retry, superseded changes, disabled/suspended recovery, school transfer, and Super Admin-only retry visibility. Queue behavior and Firebase writes still require a real queue worker and Firebase emulator/provider.

Inspection date: 2026-10-13. Related: [API.md](API.md), [SECURITY.md](SECURITY.md), [BUSINESS_RULES.md](BUSINESS_RULES.md), [CODE_STYLE.md](CODE_STYLE.md).

## Existing Setup

`bus-backend/composer.json` declares PHPUnit 11, Mockery, Laravel testing helpers, and Pint. `phpunit.xml` discovers tests/Unit and tests/Feature. Feature tests use RefreshDatabase and Laravel JSON requests; representative trip tests mock FirebaseService and NotificationBroadcaster and disable ThrottleByRole. Those tests exercise application logic, not the real Firebase SDK, rules, or socket process.

Test environment: APP_ENV=testing, SQLite :memory:, empty DB_URL, array cache/session/mail, sync queue, null broadcast connection, reduced password cost. RefreshDatabase executes migrations. SQLite does not reproduce MySQL row locking, enum changes, or production concurrency.

| Existing suite | Observed coverage |
| --- | --- |
| Unit/UserRoleTest | Role helper predicates |
| Feature/AuthControllerTest, AuthAccessTest | Registration/login/logout/profile, role mismatch, disabled login, parent-only signup, protected admin access, Firebase error redaction |
| AdminAccountCreationTest | School-admin creation restrictions and super-admin account management |
| ParentChildLinkingTest | Null-school adoption, cross-school rejection, invalid/already linked codes, guest/wrong-role rejection |
| TenantIsolationTest | Bootstrap/resource isolation, driver/parent assignment eligibility, school-scoped imports/temp paths, capacity/coordinate guards, active bus deletion, GPS tenant checks, notification recipients, super-admin scope |
| TripControllerTest | Start/finalize, notification broadcaster invocation, presence persistence, parent ready/absence and driver status with active/completed trips; repeated dashboard reload preserves today's active trip, bus timestamps and boarded attendance |
| StripeWebhookSecurityTest | Missing signature and duplicate failed-invoice event handling |
| SuperAdminAuditLogTest | School audit entries, old/new snapshots, access control, filtering/pagination |
| ThrottleByRoleTest | Request throttling |
| ChatControllerTest | Simulated reply describes current stack |

There is no frontend test script or declared Vitest/Jest/Playwright dependency in the frontend manifest. ESLint and Vite build are available; neither proves browser workflows. No Firebase rules emulator suite was found in inspected test/config files.

## Commands

Run from the stated directory only against a confirmed disposable test configuration. These are maintenance instructions, not a record that the commands passed.

| Directory | Command | Purpose |
| --- | --- | --- |
| bus-backend | `php artisan test` | Backend suite; migrates test database |
| bus-backend | `php artisan test --filter=TenantIsolationTest` | Focused tenant regressions |
| bus-backend | `php artisan test --filter=TripControllerTest` | Trip/attendance regressions |
| bus-backend | `composer test` | Clears config then runs tests; changes cache state |
| bus-backend | `php -l app/Services/FirebaseService.php` | Example PHP syntax check only |
| bus-backend | `vendor/bin/pint --test` | Read-only style check; use platform-equivalent executable on Windows |
| root | `npm run lint` | Frontend ESLint (no --fix) |
| root | `npm run build` | Vite compilation; writes frontend dist |
| root | `npm run dev` | Frontend development server |
| bus-backend | `php artisan serve` | Local API development |
| bus-backend | `php artisan notifications:serve --host=127.0.0.1 --port=8081` | Optional local socket service; writes/reads runtime log |

Do not run composer setup for verification: it installs dependencies, creates configuration, and migrates. Do not infer a live-service test from mocks or a successful build.

## High-Value Missing Regressions

1. Firebase rules emulator: unauthenticated/cross-school denial; active versus revoked membership; parent least-privilege reads; all client writes denied; school suspension and membership transfer.
2. Firebase constructor/SDK failure at start, GPS, attendance, ready/absence, completion and child linking. Confirm SQL outcome, observable failure and durable recovery. Membership controllers now create durable state; live Firebase behavior still needs an emulator/provider test.
3. Two same-bus starts, old-date active trips, delayed cleanup after a newer start, reordered GPS/attendance retries, completion racing a ping/start. Verify one authoritative projection without deleting another trip.
4. Extend the dashboard reload regression to live SQL/Firebase consistency. Today's active trip and attendance preservation are now covered with mocked external services.
5. Parent first-claim concurrency; two parents claiming the same code; disabled users with still-valid tokens; same-school wrong-parent/wrong-driver direct API requests.
6. Capacity and reassignment concurrency on MySQL; soft-deleted IDs passed through exists validators; missing nullable request keys; import identity collision and rollback.
7. Stripe processing failure then redelivery, simultaneous duplicate delivery, event reordering, malformed-but-signed payloads, customer/session creation retries, redirect-origin policy.
8. WebSocket expired/revoked tokens, disabled/deleted accounts, active connection after logout, fragmented/malformed frames and reconnect delivery.
9. Browser login/profile network failure, Firebase auth/listener ordering, sign-out/account switching, stale state after reconnection, GPS denial/timeout, repeated submissions, mobile Arabic RTL and French layout.

Prioritize disclosure of student data and cross-school access before cosmetic coverage. Build fixtures with two schools and multiple actors/resources per school; assert both response and absence of unintended writes/notifications. Preserve middleware in authorization tests.

## Documentation-Task Verification Scope

No backend suite was executed during this documentation task because RefreshDatabase runs migrations, explicitly prohibited by the request. No production configuration, dependencies, or environment variables were changed. Previous conversation test counts are historical, not a current passing result. Live Firebase, Stripe, sockets, MySQL concurrency, browser behavior, and deployment remain unverified. Documentation link and preservation checks are reported at delivery.

Executed on 2026-10-13:

- Relative Markdown links in all nine requested documents resolved successfully.
- Hash comparison confirmed all 237 pre-existing files outside AGENTS.md unchanged at verification time.
- `git diff --check -- AGENTS.md` passed (Git also noted line-ending normalization).
- `php -l bus-backend/app/Jobs/RetryFirebaseProjection.php` passed syntax only; it does not verify job integration or behavior.
- `npm.cmd run lint` failed with seven existing errors: unused motion in FloatingChatbot.jsx and RoleSelect.jsx; unused admins in admin/pages/UsersPage.jsx; Fast Refresh export rule in AuthContext.jsx; set-state-in-effect in RealtimeContext.jsx, useFirebaseActiveTrips.js and useFirebaseBusLocations.js. No auto-fixes applied.
- Frontend build was not rerun for this documentation-only change; it writes generated artifacts. No current build-pass claim is made.

## Dashboard Reload Fix Verification

On 2026-10-13, the subsequent authorized code fix added `test_dashboard_reload_preserves_todays_active_trip_and_attendance`. It failed before the fix because dashboard GET returned a null activeTripId after completing the active trip. After removing the invalid cleanup branch, `php artisan test` passed: **66 tests, 243 assertions**, using the configured SQLite memory database. PHP syntax checks passed for DriverController.php and TripControllerTest.php. No frontend code changed; frontend build/lint were not rerun for this backend-only fix. Firebase was mocked, so live projection behavior remains unverified.
