# API Reference

Update 2026-10-15: all `/api/super-admin/*` routes require an active super-admin account. Audit-log GET accepts optional `severity=info|warning|critical`; invalid severity returns 422. Omission returns all severities, with existing pagination and other filters preserved.

Realtime note: MySQL is authoritative for access-changing mutations. Membership state is recorded in `firebase_sync_failures` with desired state and `pending`/`failed`/`synced` status before the post-commit Firebase projection job. A committed response can leave a pending or failed record while Firebase is unavailable; the retry worker or protected Super Admin retry endpoint reconciles it. Billing is an inspection view of persisted school and Stripe reference fields; invoice/payment mutations are not exposed to super-admins.

Source snapshot: 2026-10-13. Inventory follows `bus-backend/routes/api.php` and its controllers under `app/Http/Controllers/Api`. Paths below include `/api`; no API version prefix. Source-verified contracts, not live endpoint test results. Related: [SECURITY.md](SECURITY.md), [BUSINESS_RULES.md](BUSINESS_RULES.md), [TESTING.md](TESTING.md).

## Shared Contract

Send `Accept: application/json`; JSON requests use `Content-Type: application/json`, uploads use multipart. Authenticated requests send `Authorization: Bearer <token>`. IDs often serialize as strings; raw School/audit responses use Eloquent serialization. Do not impose a uniform envelope. Empty keyed collections can serialize as `[]`.

Access abbreviations below:

- **Public**: no bearer requirement. Register/login limited to 5 requests/minute per IP/method/route.
- **Auth**: auth:sanctum, school.owner, 60/minute per user/role/method/route. No role/status/school-active/subscription guard on these common endpoints.
- **SA**: Auth plus super_admin; no school scope for this role.
- **Admin**, **Driver**, **Parent**: Auth plus matching active role, school.active, subscription.active; parent null-school exception described in BUSINESS_RULES.
- **Billing**: Auth plus active admin and active school; subscription not required.
- **GPS**: Driver requirements with 120/minute instead of general 60/minute.

Foreign identifiers must belong to the caller's school unless SA. Drivers additionally prove bus/trip ownership; parents prove child ownership. Validation commonly gives 422 with `{message, errors: {field: [...]}}`; authorization gives 403, missing/scoped models 404, invalid/missing credentials 401, throttling 429. Business errors often have only `{message}`. Unexpected service/database errors may return 500; external failures do not all have a stable error envelope.

Field shorthand: `?` optional/nullable, `!` required; text means string. Bounded coordinates always mean numeric latitude [-90,90], longitude [-180,180]. PUT handlers generally require full listed fields, not arbitrary partial updates.

## Authentication and Chat

Source: AuthController.php, ChatController.php.

| Method/path | Access | Request and validation | Success / specific failures |
| --- | --- | --- | --- |
| POST /api/register | Public | name! text <=255, email! unique email <=255, password! text >=8, phone? <=40, role? parent only | 201 `{access_token, token_type:"Bearer", user}`; 422 duplicates/privileged role |
| POST /api/login | Public | email! email, password! text, role? parent/driver/admin/super_admin | `{access_token,token_type,user}`; 401 bad credentials; 403 role mismatch/disabled; revokes older tokens |
| GET /api/me | Auth | None | `{user}` |
| POST /api/logout | Auth | None | `{message}`; deletes current token |
| GET /api/firebase-token | Auth | None | `{firebaseToken}`; wrapped Firebase failure 500 `{message}`, error detail only in debug |
| POST /api/chat | Auth | message! text <=4000; messages? array <=20; each role system/user/assistant and content text <=4000 | Live `{reply,model,usage}`; fallback `{reply,model,simulated:true,debug_info}`; external timeout 10 seconds, failure falls back |

Auth user fields: `id,name,email,phone,role,status,cin,schoolId,busId,studentId`; nullable relationship IDs; studentId populated only for exactly one child. No password recovery, email-verification, refresh-token, or MFA endpoint is registered.

```json
{"email":"parent@example.test","password":"example-password","role":"parent"}
```

Illustrative login request only; no real account or token is included.

## Super Administration

Source: SuperAdmin/SchoolController.php and AuditLogController.php. All SA.

| Method/path | Request | Success |
| --- | --- | --- |
| GET /api/super-admin/schools | None | `{schools:[...]}` raw school fields plus admin_count |
| POST /api/super-admin/schools | SchoolInput | 201 `{message,school}` |
| PUT /api/super-admin/schools/{school} | SchoolInput | `{message,school}` |
| PATCH /api/super-admin/schools/{school}/toggle-status | is_active? boolean; omission toggles | `{message,school}` |
| GET /api/super-admin/admins | None | `{admins:[{id,name,email,phone,role,status,school_id,school}]}` |
| POST /api/super-admin/schools/{school}/admins | school_id! integer matching path; name! <=255; email! unique <=255; password! >=8; phone? <=40 | 201 `{message,admin,school}`; admin has id/name/email/role/school_id |
| PUT /api/super-admin/admins/{user} | name! <=255; email! unique excluding current; status! active/disabled; phone? <=40; password? >=8; school_id? existing; role optional admin/super_admin | `{message,admin}` including phone/status/school; 422 if current target not admin |
| GET /api/super-admin/audit-logs | action? <=120; school_id?, user_id? existing integers; date_from?, date_to? dates; limit? int 1..100 (default20); page handled by paginator | Laravel pagination object with data, links, totals; entries include actor user and school relations |

SchoolInput: name! <=255; subdomain! <=80 matching lowercase alphanumeric hyphen-separated segments, globally unique (ignore current on update); logo_path? <=255; primary_color? six-digit hex with #; max_buses! integer >=0; is_active optional boolean. logo_path is a string, not an upload endpoint.

## School Administration

Source: AdminController.php. All Admin.

| Method/path | Request / validation | Success |
| --- | --- | --- |
| GET /api/admin/bootstrap | None | `{users,drivers,parents,students,buses,summary:{todayTrips},notifications}`; collections keyed by string ID |
| POST /api/admin/users | UserCreate | 201 `{message,user}` |
| PUT /api/admin/users/{user} | UserUpdate | `{message,user}` |
| POST /api/admin/users/{user}/disable | None | `{message}`; clears driver assignment, syncs membership |
| DELETE /api/admin/users/{user} | None | `{message}`; soft delete and detach relations |
| POST /api/admin/users/bulk-delete | userIds! array; items tenant-existing integers | `{message}` |
| POST /api/admin/students | StudentInput | 201 `{message,student}` |
| PUT /api/admin/students/{student} | StudentInput | `{message,student}` |
| DELETE /api/admin/students/{student} | None | `{message}` |
| POST /api/admin/students/bulk-delete | studentIds! array; tenant-existing integer items | `{message}` |
| POST /api/admin/students/import-preview | rows! nonempty array; each name! <=255, grade? <=255, address! text, parentName! <=255, parentEmail! email <=255, parentPhone? <=40, regCode? <=100 | `{message}`; **writes** parents/students despite preview name |
| POST /api/admin/students/parse-import-headers | Multipart file!, xlsx/csv/xls, max10240 KB | `{headers,temporary_file_path}` |
| POST /api/admin/students/finalize-import | temporary_file_path! text; mapping! object with student_name! and parent_cin! string header mappings, other values nullable strings | `{message}`; 422 wrong-school/traversal/missing temp path |
| POST /api/admin/buses | BusCreate | 201 `{message,bus}` |
| PUT /api/admin/buses/{bus} | BusUpdate | `{message,bus}` |
| DELETE /api/admin/buses/{bus} | None | `{message}`; 422 active trip |
| POST /api/admin/buses/bulk-delete | busIds! array; tenant-existing integer items | `{message}`; 422 any active trip |
| POST /api/admin/assignments | studentIds! nonempty array with tenant-existing integer items; busId? tenant-existing integer, null unassigns | `{message}`; 422 insufficient capacity |

UserCreate: role! driver/parent; name! <=255; email! unique <=255; password! >=8; phone? <=40; status? active/disabled (default active); cin? <=100; busId? tenant-existing integer. UserUpdate requires name/email/status, allows phone/password/cin/busId as above, does not accept role changes. Assigned drivers must be active; disabling clears bus assignments.

StudentInput: name! <=255; grade? <=255; address? text; regCode? globally unique <=100 (ignore current); parentId? tenant active parent integer; busId? tenant bus integer; pickupLat?, pickupLng? bounded numeric; locationConformee? boolean. Capacity failure is 422. Current implementation indexes validated grade/address directly despite nullable validation; callers should supply null when absent, and omission behavior needs regression review.

BusCreate: name!, routeName!, plateNumber! strings <=255 (plate globally unique); capacity? integer >=1 default24; schoolName? <=255; latitude?, longitude? bounded numeric. BusUpdate: same required names/plate (ignore current), optional capacity default24, driverId? active same-school driver, optional coordinates; schoolName is not updated. Rejects capacity below assigned count. School max_buses is not enforced here.

Admin serializer fields:

- user: id/name/email/phone/role/status/cin/busId.
- driver: name/firstName/lastName/email/phone/cin/busId/licensePlate/status.
- parent: name/email/phone/childIds/status.
- student: name/grade/address/regCode/parentId/parentName/parentEmail/parentPhone/busId/status/locationConformee/homeLocation.
- bus: name/routeName/driverName/driverEmail/plateNumber/capacity/schoolName/tripStatus/activeTripId/location.

Student/bus values do not include their own ID in these admin serializers; dictionary keys supply it in bootstrap. Missing relationship IDs often use empty strings, not null. Location values are `{lat,lng}` or null.

## Billing and Webhook

Source: SchoolAdmin/BillingController.php, StripeWebhookController.php.

| Method/path | Access | Request | Success / specific errors |
| --- | --- | --- | --- |
| GET /api/admin/billing/status | Billing | None | `{school,plans}` |
| POST /api/admin/billing/subscribe | Billing | plan_id! starter/pro/enterprise; success_url!, cancel_url! valid URLs | `{checkout_url}`; Stripe failures may propagate |
| POST /api/admin/billing/portal | Billing | return_url! valid URL | `{portal_url}`; 422 no Stripe customer |
| POST /api/stripe/webhook | Signed public | Raw Stripe event body and Stripe-Signature header | `{received:true}` or `{received:true,duplicate:true}`; 400 missing secret/signature or invalid payload/envelope; processing failure can be 500 |

Billing school fields: id/name/subscription_status/max_buses/active_buses/stripe_customer_id/stripe_subscription_id/stripe_price_id/trial_ends_at/subscription_ends_at/is_subscribed/is_on_trial/is_on_grace_period/has_expired. Plan fields: id/name/description/amount_cents/price/max_buses. Event types handled: customer.subscription.created/updated/deleted and invoice.payment_failed; others acknowledged without domain mutation. Failed IDs are currently also suppressed on redelivery.

## Driver and Trips

Source: DriverController.php and TripController.php. All Driver except GPS as indicated.

| Method/path | Request / validation | Success / specific errors |
| --- | --- | --- |
| GET /api/driver/dashboard | None | `{bus,students,notifications}`; bus nullable, students keyed by string ID; endpoint currently has state-mutating cleanup |
| POST /api/driver/trip/start | busId! tenant integer assigned to caller; type? aller/retour | 201 `{message,tripId,trip:{id,status,type,tripDate,startedAt}}` |
| POST /api/driver/trip/ping-location | GPS; tripId! tenant integer active and driver-owned; latitude!, longitude! bounded; currentTargetId? tenant integer | `{distance,alerts}`; distance rounded meters or null, alerts array may contain near/arrived; 404 unavailable trip |
| POST /api/driver/trip/nudge-parent | tripId!, studentId! tenant integers; active driver trip and student on bus | `{message}`; 422 child has no linked parent |
| POST /api/driver/students/{student}/status | busId! tenant integer assigned to caller; status! mounted/absent/in_bus | `{message}`; 422 student not assigned to bus; persists student without requiring active trip |
| POST /api/trips/{trip}/finalize | attendance! array min1; each student_id! tenant integer, status! waiting/mounted/absent/dropped, recorded_at? date; final_location? object with lat/lng required when object provided, bounded | `{message,tripId,presencesCount}`; 403 wrong driver; 409 nonactive trip; 422 invalid student includes studentIds |
| GET /api/driver/notifications | None | `{notifications:[...]}` max20 newest |
| POST /api/driver/notifications/mark-read | None | `{message}`; marks recipient's unread records |

Driver bus: id/name/routeName/plateNumber/capacity/driverName/tripStatus/activeTripId/location. Driver student: name/address/grade/busId/status/locationConformee/homeLocation. Driver notification: id/studentId/type/title/helper/read/createdAt (`helper` is message).

```json
{"busId":12,"type":"aller"}
```

Example start payload. Example successful GPS response from the documented shape:

```json
{"distance":null,"alerts":[]}
```

## Parent

Source: ParentController.php. All Parent; student mutation requests additionally prove parent_id ownership.

| Method/path | Request / validation | Success / specific errors |
| --- | --- | --- |
| GET /api/parent/dashboard | None | `{student,bus,notifications}`; first child by ID only, student/bus nullable |
| POST /api/parent/link-child | reg_code! string, trimmed | `{message,student}`; 422 invalid/already claimed/cross-school; 403 target school inactive or subscription ineligible |
| POST /api/parent/confirm-location | student_id! tenant integer; latitude!, longitude! bounded | `{message,student}`; 404 not owned |
| POST /api/parent/ready | studentId! tenant integer | `{message}`; 404 not owned |
| POST /api/parent/absence | studentId! tenant integer | `{message,student}`; 404 not owned |
| GET /api/parent/notifications | None | `{notifications:[...]}` max50 newest |
| POST /api/parent/notifications/mark-read | None | `{message}` |

Parent student: id/name/grade/address/parentId/parentName/parentEmail/parentPhone/busId/status/locationConformee/homeLocation. Parent bus: id/name/routeName/driverName/plateNumber/tripStatus/activeTripId/latestTripType/location. Parent notification: id/studentId/type/title/message/studentName/payload/read/createdAt.

## Contract Review Items

No universal active-account guard covers common endpoints. Firebase reads are school-wide despite parent REST restrictions. Parent linking prechecks are not locked; import-preview parent identity and registration-code uniqueness are not fully validated before persistence. Finalization accepts subsets/duplicate student entries and has no concurrency lock around its active-state check. Nullable student fields and absent relationships require tests. See SECURITY and TESTING for priorities; these documentation findings were not auto-fixed.

Non-API routes: Laravel `/` serves welcome; `/up` is the configured health route. `DriverController::startTrip` is not the start route target; the routed implementation is TripController::start. No route CRUD, historical GPS API, or archive endpoint appears in routes/api.php.
