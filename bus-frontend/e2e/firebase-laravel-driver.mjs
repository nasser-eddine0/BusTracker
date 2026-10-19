import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { initializeApp } = require('firebase/app');
const { connectAuthEmulator, getAuth, signInWithCustomToken } = require('firebase/auth');
const { connectDatabaseEmulator, get, getDatabase, ref, set } = require('firebase/database');

const baseUrl = process.env.LARAVEL_URL || 'http://127.0.0.1:8099';
const email = process.env.BUS_TRACKER_TEST_EMAIL || 'synthetic-driver@example.test';
const password = process.env.BUS_TRACKER_TEST_PASSWORD;
if (!password) throw new Error('BUS_TRACKER_TEST_PASSWORD is required for the synthetic driver harness.');
const schoolId = process.env.BUS_TRACKER_TEST_SCHOOL_ID || '1';
const otherSchoolId = process.env.BUS_TRACKER_OTHER_SCHOOL_ID || '2';
const assignedBusId = process.env.DRIVER_ASSIGNED_BUS_ID;
const unassignedBusId = process.env.DRIVER_UNASSIGNED_BUS_ID;
const otherSchoolBusId = process.env.DRIVER_OTHER_SCHOOL_BUS_ID;
const databaseNamespace = 'demo-bustracker-default-rtdb';
const database = initializeApp({
  apiKey: 'fake',
  authDomain: 'demo-bustracker.firebaseapp.com',
  databaseURL: `https://${databaseNamespace}.firebaseio.com`,
  projectId: 'demo-bustracker',
});
const auth = getAuth(database);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = getDatabase(database);
connectDatabaseEmulator(db, '127.0.0.1', 9000);

const required = {
  DRIVER_ASSIGNED_BUS_ID: assignedBusId,
  DRIVER_UNASSIGNED_BUS_ID: unassignedBusId,
  DRIVER_OTHER_SCHOOL_BUS_ID: otherSchoolBusId,
};
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error(`Missing driver fixture IDs: ${missing.join(', ')}`);

const json = async (response) => {
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
};
const ownerRequest = async (path, options = {}) => json(await fetch(
  `http://127.0.0.1:9000/${path}.json?ns=${databaseNamespace}`,
  { ...options, headers: { authorization: 'Bearer owner', 'content-type': 'application/json', ...(options.headers || {}) } },
));
const expectDenied = async (path, label) => {
  try {
    await get(ref(db, path));
    console.log(`${label}: FAIL (read unexpectedly succeeded) [${path}]`);
    return false;
  } catch (error) {
    const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    const pass = text.includes('permission_denied') || text.includes('permission denied');
    console.log(`${label}: ${pass ? 'PASS' : 'FAIL'} (${error?.code || error?.message || 'unknown'}) [${path}]`);
    return pass;
  }
};
const expectWriteDenied = async (path) => {
  try {
    await set(ref(db, path), { unauthorized: true });
    console.log(`client write denied: FAIL (write unexpectedly succeeded) [${path}]`);
    return false;
  } catch (error) {
    const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    const pass = text.includes('permission_denied') || text.includes('permission denied');
    console.log(`client write denied: ${pass ? 'PASS' : 'FAIL'} (${error?.code || error?.message || 'unknown'}) [${path}]`);
    return pass;
  }
};

await ownerRequest(`active_trips/${schoolId}/assignedTrip`, {
  method: 'PUT', body: JSON.stringify({ trip_id: 'assignedTrip', bus_id: assignedBusId, status: 'in_progress' }),
});
await ownerRequest(`active_trips/${schoolId}/unassignedTrip`, {
  method: 'PUT', body: JSON.stringify({ trip_id: 'unassignedTrip', bus_id: unassignedBusId, status: 'in_progress' }),
});
await ownerRequest(`active_trips/${otherSchoolId}/otherTrip`, {
  method: 'PUT', body: JSON.stringify({ trip_id: 'otherTrip', bus_id: otherSchoolBusId, status: 'in_progress' }),
});
await ownerRequest(`active_buses/${schoolId}/${assignedBusId}`, {
  method: 'PUT', body: JSON.stringify({ bus_id: assignedBusId, status: 'active' }),
});
await ownerRequest(`active_buses/${schoolId}/${unassignedBusId}`, {
  method: 'PUT', body: JSON.stringify({ bus_id: unassignedBusId, status: 'active' }),
});
await ownerRequest(`active_buses/${otherSchoolId}/${otherSchoolBusId}`, {
  method: 'PUT', body: JSON.stringify({ bus_id: otherSchoolBusId, status: 'active' }),
});

const login = await json(await fetch(`${baseUrl}/api/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, role: 'driver' }),
}));
const token = await json(await fetch(`${baseUrl}/api/firebase-token`, {
  headers: { authorization: `Bearer ${login.access_token}` },
}));
await signInWithCustomToken(auth, token.firebaseToken);
const uid = auth.currentUser?.uid;
if (!uid) throw new Error('Firebase Auth did not expose an authenticated UID.');
const schoolAMembershipPath = `school_users/${schoolId}/${uid}`;
const schoolBMembershipPath = `school_users/${otherSchoolId}/${uid}`;
await ownerRequest(schoolAMembershipPath, {
  method: 'PUT', body: JSON.stringify({ active: true, role: 'driver', allowedBusIds: { [assignedBusId]: true } }),
});
await ownerRequest(schoolBMembershipPath, { method: 'PUT', body: 'null' });
const setupState = {
  schoolAMembership: await ownerRequest(schoolAMembershipPath),
  schoolBMembership: await ownerRequest(schoolBMembershipPath),
  otherSchoolTrip: await ownerRequest(`active_trips/${otherSchoolId}/otherTrip`),
  otherSchoolBus: await ownerRequest(`active_buses/${otherSchoolId}/${otherSchoolBusId}`),
};
console.log(JSON.stringify({ uid, laravelUserId: login.user?.id ?? login.data?.user?.id, schoolId, assignedBusId, unassignedBusId, otherSchoolBusId, databaseNamespace, setupOrigin: 'direct emulator owner setup', tokenOrigin: 'Laravel /api/firebase-token', client: 'Firebase JavaScript SDK', setupState }));
if (setupState.schoolBMembership !== null && setupState.schoolBMembership !== undefined) {
  throw new Error(`Stale emulator state: ${schoolBMembershipPath} is not absent before authorization checks.`);
}

const checks = [];
try {
  await get(ref(db, `active_trips/${schoolId}/assignedTrip`));
  console.log(`assigned trip read: PASS [active_trips/${schoolId}/assignedTrip]`);
  checks.push(true);
} catch (error) {
  console.log(`assigned trip read: FAIL (${error?.code || error?.message})`); checks.push(false);
}
try {
  await get(ref(db, `active_buses/${schoolId}/${assignedBusId}`));
  console.log(`assigned bus read: PASS [active_buses/${schoolId}/${assignedBusId}]`);
  checks.push(true);
} catch (error) {
  console.log(`assigned bus read: FAIL (${error?.code || error?.message})`); checks.push(false);
}
checks.push(await expectDenied(`active_trips/${schoolId}/unassignedTrip`, 'unassigned trip read'));
checks.push(await expectDenied(`active_buses/${schoolId}/${unassignedBusId}`, 'unassigned bus read'));
checks.push(await expectDenied(`active_trips/${otherSchoolId}/otherTrip`, 'cross-school trip read'));
checks.push(await expectDenied(`active_buses/${otherSchoolId}/${otherSchoolBusId}`, 'cross-school bus read'));
checks.push(await expectDenied(`active_trips/${schoolId}`, 'driver parent-node read'));
checks.push(await expectWriteDenied(`active_trips/${schoolId}/assignedTrip`));
if (checks.every(Boolean)) console.log('driver authorization scenario: PASS');
else throw new Error('driver authorization scenario: FAIL');
