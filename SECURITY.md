# Application Security

Update 2026-10-16: EnsureSuperAdmin requires both `role=super_admin` and `status=active`, including requests using previously issued tokens. Super Admin account mutations cannot self-disable/self-demote or remove the last active platform administrator; rejected attempts are audited. School-admin credential and membership changes revoke tokens and use verified school membership. This does not repair the separately documented Firebase membership revocation gaps.

Source review dated 2026-10-13; no penetration test, live Firebase check, infrastructure audit, or compliance assessment was performed. Related: [API.md](API.md), [DATABASE.md](DATABASE.md), [TESTING.md](TESTING.md).

Reference frameworks: [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) for verification planning and [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) for API risk classification. These references do not constitute a completed ASVS checklist or certification.

## Control Inventory

| Control | Status | Repository evidence and limits |
| --- | --- | --- |
| Password authentication | Verified implemented | AuthController validates credentials; User hashed password cast; public registration fixes role to parent; minimum eight-character passwords |
| REST bearer authentication | Verified implemented | auth:sanctum; token hashes in personal_access_tokens; config/sanctum.php sets 1440-minute expiry; login revokes previous tokens; logout revokes current token |
| Browser token handling | Partially implemented | AuthContext stores tokens in localStorage, exposed to any successful same-origin script injection; cached user is not server authorization |
| Password recovery/MFA | Missing | Reset-token table exists but routes/api.php has no recovery or MFA flow |
| Email verification enforcement | Missing | User implements MustVerifyEmail, but API routes have no verified middleware/verification endpoints |
| Role and disabled-user checks | Partially implemented | EnsureUserRole checks role/status; common /me, /chat and /firebase-token have separate eligibility behavior; super_admin routes require role/status through EnsureSuperAdmin |
| Tenant isolation and IDOR/BOLA | Partially implemented | BelongsToSchool, school.owner, tenantExists, explicit school/bus/parent predicates; jobs/raw queries do not inherit database isolation; Firebase is broader than parent REST access |
| Privileged account creation | Verified implemented | Public registration parent-only; school admin creates driver/parent; school admin creation routed through super_admin; platform-account self/last-admin safeguards are enforced |
| Validation/property selection | Partially implemented | Request validation and explicit fill/serialization are common; importPreviewRows and some update routes need additional domain restrictions |
| SQL injection prevention | Verified implemented in inspected request paths | Eloquent/query builder bindings; inspected raw SQL is static migration SQL. Not an exhaustive injection certification |
| XSS protection | Partially implemented | React text rendering used; no comprehensive CSP/HTML-sink/browser-security verification performed |
| CSRF | Not applicable to bearer-only SPA requests | Authorization header is explicitly attached. Cookie/session integrations require separate review; CORS is not authorization |
| JWT | Not applicable to Laravel API | Sanctum personal-access tokens, not application JWTs; Firebase uses its separate SDK authentication flow |
| CORS | Verified implemented | config/cors.php uses FRONTEND_URLS/FRONTEND_URL allowlist; actual deployed origins unverified |
| Rate limiting | Verified implemented | ThrottleByRole: registration/login 5/min; authenticated general routes 60/min; GPS 120/min, identity/method/route key |
| Firebase client writes | Verified implemented in rules file | Root deny; active_trips and active_buses writes false. Deployment/emulator behavior not tested |
| Firebase least-privilege reads/revocation | Partially implemented | Active membership gates school collections; no child/bus restriction or school subscription flag in read rules |
| GPS authorization | Verified implemented in REST source | TripController requires school, driver-owned in_progress trip, bounded coordinates; selected target must belong to bus |
| WebSocket authentication | Partially implemented | Token hash checked; expiry/account status/school state are not checked or revalidated |
| Upload security | Partially implemented | Excel MIME whitelist and 10MB limit; tenant temp path and traversal checks. Malware scanning and parser resource limits not verified |
| Stripe authenticity | Verified implemented | Signature required; unique event ID suppresses duplicates. Failed-event replay is incomplete |
| Audit logging | Partially implemented | Login, school operations and subscription events use AuditLogger; not all mutations audited; no immutable sink |
| Secrets management | Not verified | Config reads environment; deployment secret custody/rotation not inspected; no secret files opened |
| Dependency security | Not verified | Composer/NPM manifests and locks exist; no current advisory scan executed |
| TLS, backups, encryption, monitoring | Not verified | Live hosting, restore drills, security headers, log permissions and alerting not inspected |

## Confirmed Source-Level Concerns

### School-wide realtime reads

`database.rules.json` grants `.read` at `active_trips/{schoolId}` and `active_buses/{schoolId}` solely on active membership. Consequently a signed-in parent can directly read other buses' locations and student-ID attendance in the same school, regardless of UI filters. `FirebaseService::projectTripStarted` supplies those fields. Cross-school access is gated; within-school least privilege is not. Review the intended sharing policy and enforce it at the rules/data-path level (API1/API3).

### Incomplete realtime revocation

`FirebaseService::syncUserMembership` derives active from user status/deletion, not school activation or subscription. `SchoolController::toggleStatus` and Stripe handlers do not invalidate membership; `SchoolController::updateAdmin` does not clear prior-school membership. Existing Firebase sessions can therefore retain reads after those REST eligibility changes. AdminController logs failed membership sync without durable recovery, so disabling during a Firebase outage can also leave stale access. Live exploitability depends on deployed rules/state; the missing synchronization is confirmed.

### WebSocket sessions bypass lifecycle checks

`ServeNotificationWebSocket::resolveUserIdFromToken` checks stored hash and returns tokenable_id without expiry, user status, deletion, school, or subscription checks. Connected clients are never revalidated. An expired-but-stored token or a connection retained after logout can receive later notifications addressed to that user. Use the same eligibility semantics as REST, with revocation handling; do not expose plaintext WS in production (API2).

### Common API routes omit active-account checks

`/chat`, `/me`, `/firebase-token` use auth/school.owner/throttle, not role/status/school/subscription middleware. Disabled users whose tokens remain can reach them; Firebase membership active=false still denies their RTDB reads when synchronized. `EnsureSuperAdmin` checks role alone. Evaluate and test endpoint-specific eligibility rather than claiming uniform disabled-user enforcement (API2/API5).

## Review Targets, Not Proven Exploits

Child-link ownership checks precede the transaction without locking; concurrent first claims need a regression. Import parent lookup by CIN or email does not universally constrain role; request validation alone does not prove correct parent identity. Capacity checks can race. These require targeted tests before declaring full protection. Stripe retries of failed events are suppressed as duplicates; see [BUSINESS_RULES.md](BUSINESS_RULES.md).

## Required Invariants and Operations

Always derive tenant ownership from authenticated context; explicit scope is mandatory for queues, raw SQL, imports, and scope bypasses. Enforce driver/trip and parent/child relationships server-side. Coordinate ranges alone do not establish trustworthy GPS origin. Preserve client-write denial and never put Admin SDK credentials in Vite variables.

Student names, contact details, CIN, registration codes, home coordinates and attendance are sensitive. Restrict log/export access, minimize retention, establish deletion and consent policies, and review external sharing (maps, chat, Stripe). No Moroccan privacy-law compliance claim is made. Browser map requests reach external tile providers; user chat history can reach xAI when configured.

Production review must cover HTTPS/WSS, debug disabled, allowed origins, token expiry/revocation, dependency advisories, least-privilege service accounts/database users, protected backups with restore tests, log rotation, and monitored failure recovery. These are verification requirements, not confirmed deployment properties. Test priorities are in [TESTING.md](TESTING.md).
