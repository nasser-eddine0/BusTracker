import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { initializeApp } = require('firebase/app');
const { connectAuthEmulator, getAuth, signInWithCustomToken } = require('firebase/auth');
const { connectDatabaseEmulator, get, getDatabase, ref, set } = require('firebase/database');

const baseUrl = process.env.LARAVEL_URL || 'http://127.0.0.1:8099';
const email = process.env.BUS_TRACKER_TEST_EMAIL || 'synthetic-parent@example.test';
const password = process.env.BUS_TRACKER_TEST_PASSWORD;
if (!password) throw new Error('BUS_TRACKER_TEST_PASSWORD is required for the synthetic parent harness.');
const schoolId = process.env.BUS_TRACKER_TEST_SCHOOL_ID || '1';
const otherSchoolId = process.env.BUS_TRACKER_OTHER_SCHOOL_ID || '2';
const authorizedBusId = process.env.PARENT_AUTHORIZED_BUS_ID;
const unauthorizedBusId = process.env.PARENT_UNAUTHORIZED_BUS_ID;
const otherSchoolBusId = process.env.PARENT_OTHER_SCHOOL_BUS_ID;
const namespace = 'demo-bustracker-default-rtdb';
const app = initializeApp({ apiKey: 'fake', authDomain: 'demo-bustracker.firebaseapp.com', databaseURL: `https://${namespace}.firebaseio.com`, projectId: 'demo-bustracker' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = getDatabase(app);
connectDatabaseEmulator(db, '127.0.0.1', 9000);
const missing = Object.entries({ PARENT_AUTHORIZED_BUS_ID: authorizedBusId, PARENT_UNAUTHORIZED_BUS_ID: unauthorizedBusId, PARENT_OTHER_SCHOOL_BUS_ID: otherSchoolBusId }).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error(`Missing parent fixture IDs: ${missing.join(', ')}`);

const json = async (response) => { const body = await response.json(); if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`); return body; };
const owner = async (path, options = {}) => json(await fetch(`http://127.0.0.1:9000/${path}.json?ns=${namespace}`, { ...options, headers: { authorization: 'Bearer owner', 'content-type': 'application/json', ...(options.headers || {}) } }));
const denied = async (path, label) => { try { await get(ref(db, path)); console.log(`${label}: FAIL (read unexpectedly succeeded) [${path}]`); return false; } catch (error) { const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase(); const pass = text.includes('permission_denied') || text.includes('permission denied'); console.log(`${label}: ${pass ? 'PASS' : 'FAIL'} (${error?.code || error?.message || 'unknown'}) [${path}]`); return pass; } };
const writeDenied = async (path) => { try { await set(ref(db, path), { unauthorized: true }); console.log(`client write denied: FAIL [${path}]`); return false; } catch (error) { const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase(); const pass = text.includes('permission_denied') || text.includes('permission denied'); console.log(`client write denied: ${pass ? 'PASS' : 'FAIL'} (${error?.code || error?.message || 'unknown'}) [${path}]`); return pass; } };

await owner(`active_trips/${schoolId}/authorizedTrip`, { method: 'PUT', body: JSON.stringify({ trip_id: 'authorizedTrip', bus_id: authorizedBusId, status: 'in_progress' }) });
await owner(`active_trips/${schoolId}/unauthorizedTrip`, { method: 'PUT', body: JSON.stringify({ trip_id: 'unauthorizedTrip', bus_id: unauthorizedBusId, status: 'in_progress' }) });
await owner(`active_trips/${otherSchoolId}/otherTrip`, { method: 'PUT', body: JSON.stringify({ trip_id: 'otherTrip', bus_id: otherSchoolBusId, status: 'in_progress' }) });
for (const [school, bus] of [[schoolId, authorizedBusId], [schoolId, unauthorizedBusId], [otherSchoolId, otherSchoolBusId]]) await owner(`active_buses/${school}/${bus}`, { method: 'PUT', body: JSON.stringify({ bus_id: bus, status: 'active' }) });

const login = await json(await fetch(`${baseUrl}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, role: 'parent' }) }));
const token = await json(await fetch(`${baseUrl}/api/firebase-token`, { headers: { authorization: `Bearer ${login.access_token}` } }));
await signInWithCustomToken(auth, token.firebaseToken);
const uid = auth.currentUser?.uid;
if (!uid) throw new Error('Firebase Auth did not expose an authenticated UID.');
const membershipPath = `school_users/${schoolId}/${uid}`;
await owner(membershipPath, { method: 'PUT', body: JSON.stringify({ active: true, role: 'parent', allowedBusIds: { [String(authorizedBusId)]: true } }) });
await owner(`school_users/${otherSchoolId}/${uid}`, { method: 'PUT', body: 'null' });
const membership = await owner(membershipPath);
const otherMembership = await owner(`school_users/${otherSchoolId}/${uid}`);
console.log(JSON.stringify({ uid, laravelUserId: login.user?.id ?? login.data?.user?.id, schoolId, childA: process.env.PARENT_CHILD_A_ID, childB: process.env.PARENT_CHILD_B_ID, membershipPath, membership, otherMembership, authorizedBusId, unauthorizedBusId, otherSchoolBusId, namespace, setupOrigin: 'direct emulator owner setup', tokenOrigin: 'Laravel /api/firebase-token', client: 'Firebase JavaScript SDK' }));
if (otherMembership !== null && otherMembership !== undefined) throw new Error('Stale emulator state: parent membership exists in the other school.');

const checks = [];
try { await get(ref(db, `active_trips/${schoolId}/authorizedTrip`)); console.log('authorized child trip read: PASS'); checks.push(true); } catch (error) { console.log(`authorized child trip read: FAIL (${error?.message})`); checks.push(false); }
try { await get(ref(db, `active_buses/${schoolId}/${authorizedBusId}`)); console.log('authorized child bus read: PASS'); checks.push(true); } catch (error) { console.log(`authorized child bus read: FAIL (${error?.message})`); checks.push(false); }
checks.push(await denied(`active_trips/${schoolId}/unauthorizedTrip`, 'unauthorized child trip read'));
checks.push(await denied(`active_buses/${schoolId}/${unauthorizedBusId}`, 'unauthorized child bus read'));
checks.push(await denied(`active_trips/${otherSchoolId}/otherTrip`, 'cross-school trip read'));
checks.push(await denied(`active_buses/${otherSchoolId}/${otherSchoolBusId}`, 'cross-school bus read'));
checks.push(await denied(`active_trips/${schoolId}`, 'parent-level active_trips read'));
checks.push(await writeDenied(`active_trips/${schoolId}/authorizedTrip`));
if (!checks.every(Boolean)) throw new Error('parent authorization scenario: FAIL');
console.log('parent authorization scenario: PASS');
