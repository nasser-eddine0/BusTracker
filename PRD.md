# BusTracker Product Requirements

Source-grounded product snapshot: 2026-10-13. Product context supplied by the owner: multi-tenant SaaS for Moroccan private-school transportation and live GPS tracking. This document separates existing code from requirements; it is not approval of new features, pricing or service levels. Related: [BUSINESS_RULES.md](BUSINESS_RULES.md), [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md).

## Vision and Audience

Help schools coordinate buses, drivers and student transport; let drivers record boarding/absence and share location; let parents see bus progress and communicate pickup readiness. Main users are the platform operator (super_admin), school administrators (admin), drivers, and parents. Students are managed records, not login accounts. Multiple guardians per student are not modeled.

Problems addressed by existing workflows: fragmented fleet/student assignments, uncertain pickup timing, manual attendance updates, parent-driver coordination and separation of school data. No quantified adoption, uptime, revenue or latency target was supplied.

## Implementation Status

"Implemented and verified" below means source verified, not end-to-end production acceptance.

| Capability | Status | Evidence / boundary |
| --- | --- | --- |
| School onboarding and admin management | Implemented and verified | SuperAdmin/SchoolController, SuperAdminDashboard; create/update/status and audit views |
| Role-specific REST access and tenant predicates | Implemented and verified, with gaps | routes/api.php, middleware, BelongsToSchool; realtime and common-endpoint gaps in SECURITY |
| Fleet/users/students/assignments | Implemented and verified | AdminController and admin pages; capacity checks; bus quota not enforced |
| Spreadsheet import | Implemented and verified, with onboarding gaps | Header mapping, school-specific temp path, StudentsImport; generated credentials not delivered |
| Parent child linking and pickup confirmation | Implemented and verified | ParentController/API wrappers; cross-school/claim checks; concurrency unverified |
| Multiple-child parent experience | Partially implemented | Model supports multiple children; dashboard selects first child |
| Trip start, attendance and completion | Partially implemented | SQL handlers and driver page exist; dashboard reload regression fixed; races and projection failure gaps remain |
| Live GPS tracking | Partially implemented | Five-second browser sampling, REST persistence, Firebase listeners and Leaflet maps; availability/recovery and least privilege incomplete |
| Ready/absence/nudge/proximity alerts | Implemented and verified in source | Parent/Driver/Trip controllers; delivery and duplicate suppression not guaranteed |
| Notifications | Partially implemented | SQL, local WebSocket and polling; no durable push acknowledgement or complete revocation |
| Subscription billing | Partially implemented | Stripe Checkout/Portal/webhooks and billing page; failed-event recovery and quota enforcement incomplete |
| Archive and analytics | Partially implemented/prototype | AdminDashboard invokes buildAdminDashboardMockData; no corresponding historical reporting API |
| Arabic/French localization | Partially implemented | translations and LanguageContext with RTL/LTR; hardcoded strings remain; completeness untested |
| Mobile responsiveness | Partially implemented | Responsive classes and driver/parent views; device/browser acceptance not run |
| Chat assistant | Partially implemented | Configurable xAI call with simulated fallback; not a privileged operational agent |
| Automated WhatsApp delivery | Not implemented as claimed in README | UsersPage opens wa.me; no verified provider delivery integration |
| Route CRUD/optimization | Not implemented as a separate domain | route_name field only; no routes/stops schema or API |
| Password recovery and invitations | Missing | Framework table exists without application recovery/invitation routes |
| Durable Firebase retries | Partially implemented, not connected | Job/model/migration files exist; controller dispatch absent |

## Core Workflows and Acceptance Criteria

These criteria define verification targets; they are not claims that all currently pass.

| Workflow | Required observable outcome | Current limit |
| --- | --- | --- |
| Onboard school/admin | Operator creates school and admin; ordinary users cannot perform operation; audit captures action without password | Production onboarding and complete audit coverage unverified |
| Assign fleet | Only same-school active driver/parent relationships; no over-capacity student assignment | Concurrent capacity changes and quota enforcement need work |
| Link child | Valid unclaimed code links correct child; wrong-school/already claimed code leaves data unchanged | Concurrent first claims untested; first-child-only dashboard |
| Start/reload trip | Assigned driver starts trip with waiting attendance; reload preserves active trip; old projection cannot replace new | Dashboard reload covered by regression; stale-projection defects remain |
| GPS tracking | Valid driver updates owned active trip; other schools denied; position displayed with known freshness | Offline recovery, stale indication and delivery SLO not established |
| Attendance/finalize | Owned bus students update; final records survive refresh; completion cannot corrupt another active trip | Cross-service partial failures and concurrent finalize unverified |
| Ready/absence | Parent changes only linked child; driver's view and notification converge | State-transition ordering/recovery incomplete |
| Suspend/revoke | REST, Firebase and WebSocket stop unauthorized access consistently | Current transports have different revocation semantics |
| Billing | Signed event applies once; failed delivery can recover; wrong-school state unaffected | Failed event currently suppressed on redelivery |
| Localized mobile use | Important actions usable without overlap in Arabic RTL and French LTR; GPS permission failures understandable | Browser/device/accessibility verification pending |

## Non-Functional and Privacy Requirements

Existing mechanisms include role middleware, tenant predicates, validation, selected SQL transactions, indexes, throttling and token hashing. Required product properties are protection of student/location data, correct school boundaries, understandable network failures, persistence of accepted attendance, and operable mobile workflows. Their full satisfaction is not verified.

Proposed recommendations requiring approval: define availability/latency and retention targets, supported devices, accessibility acceptance level, monitoring/incident ownership, recovery objectives, and privacy/consent/deletion policy. Do not invent numerical SLAs or claim regulatory compliance. Morocco is the target market; current Stripe code prices in USD, so currency/tax/payment-market suitability is a product decision still requiring confirmation.

## MVP and Future Scope

Current code provides the core candidate MVP: school administration, fleet/student assignment, parent linking, driver trips/attendance, map tracking and notifications. It is not production-ready acceptance evidence; outstanding security and reliability items must be verified before release. Billing/chat/analytics exist at differing maturity and should not obscure transport correctness.

Explicitly documented work: the existing BusTracker_QA_Audit_Remediation_Plan.md calls for Firebase identity/path alignment, failure resilience, tenant-safe imports and notification fixes. Some are already represented in uncommitted code; validate source rather than treating every historical finding as still open. README describes French/Arabic, GPS and WhatsApp/route features more broadly than the implementation supports.

Proposed future work, requiring owner approval: multiple-child selection and multiple guardians, complete invitation/recovery flow, durable realtime reconciliation, historical trip reporting, real route/stop planning, notification delivery tracking, and formal production operations. No roadmap dates, contractual commitments or new architecture are implied.
