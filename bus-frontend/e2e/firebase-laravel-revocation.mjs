import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { initializeApp } = require('firebase/app');
const { connectAuthEmulator, getAuth, signInWithCustomToken } = require('firebase/auth');
const {
  connectDatabaseEmulator,
  get,
  getDatabase,
  goOnline,
  onValue,
  ref,
} = require('firebase/database');

const baseUrl = process.env.LARAVEL_URL || 'http://127.0.0.1:8099';
const email = process.env.BUS_TRACKER_TEST_EMAIL || 'phase19g@example.test';
const password = process.env.BUS_TRACKER_TEST_PASSWORD;
if (!password) throw new Error('BUS_TRACKER_TEST_PASSWORD is required for the synthetic revocation harness.');
const testRole = process.env.BUS_TRACKER_TEST_ROLE || 'parent';
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
const schoolId = process.env.BUS_TRACKER_TEST_SCHOOL_ID || '1';
const transferMode = process.env.TRANSFER_MODE === '1';
const newSchoolId = process.env.BUS_TRACKER_NEW_SCHOOL_ID || '2';
const tripId = process.env.BUS_TRACKER_TEST_TRIP_ID || 'tripA';
const databaseNamespace = 'demo-bustracker-default-rtdb';
const tripPath = `active_trips/${schoolId}/${tripId}`;
const newTripPath = `active_trips/${newSchoolId}/tripB`;
const readPath = testRole === 'admin' ? `active_trips/${schoolId}` : tripPath;
const databaseEmulatorUrl = `http://127.0.0.1:9000`;
const ownerToken = process.env.FIREBASE_EMULATOR_TOKEN || 'owner';

const app = initializeApp({
  apiKey: 'fake',
  authDomain: 'demo-bustracker.firebaseapp.com',
  databaseURL: `https://${databaseNamespace}.firebaseio.com`,
  projectId: 'demo-bustracker',
});
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const database = getDatabase(app);
connectDatabaseEmulator(database, '127.0.0.1', 9000);
goOnline(database);

const json = async (response) => {
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
};

const emulatorRequest = async (path, options = {}) => {
  const response = await fetch(`${databaseEmulatorUrl}/${path}.json?ns=${databaseNamespace}`, {
    ...options,
    headers: {
      authorization: `Bearer ${ownerToken}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return json(response);
};

const setupMembership = {
  active: true,
  role: testRole,
  allowedBusIds: { busA: true },
};
const setupTrip = {
  trip_id: tripId,
  bus_id: 'busA',
  status: 'in_progress',
};
const setupNewTrip = { trip_id: 'tripB', bus_id: 'busB', status: 'in_progress' };

await emulatorRequest(`active_trips/${schoolId}/${tripId}`, {
  method: 'PUT',
  body: JSON.stringify(setupTrip),
});
if (transferMode) {
  await emulatorRequest(newTripPath, { method: 'PUT', body: JSON.stringify(setupNewTrip) });
}
const writtenTrip = await emulatorRequest(`active_trips/${schoolId}/${tripId}`);

const login = await json(await fetch(`${baseUrl}/api/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, role: testRole }),
}));
const tokenResponse = await json(await fetch(`${baseUrl}/api/firebase-token`, {
  headers: { authorization: `Bearer ${login.access_token}` },
}));

await signInWithCustomToken(auth, tokenResponse.firebaseToken);
const uid = auth.currentUser.uid;
const membershipPath = `school_users/${schoolId}/${uid}`;
await emulatorRequest(membershipPath, {
  method: 'PUT',
  body: JSON.stringify(setupMembership),
});
if (transferMode) {
  await emulatorRequest(`school_users/${newSchoolId}/${uid}`, {
    method: 'PUT', body: JSON.stringify({ active: false, role: testRole, allowedBusIds: { busB: true } }),
  });
}
const writtenMembership = await emulatorRequest(membershipPath);
console.log(JSON.stringify({
  setupNamespace: databaseNamespace,
  setupMembershipPath: membershipPath,
  setupMembership: writtenMembership,
  setupTripPath: tripPath,
  setupTrip: writtenTrip,
  sdkDatabaseUrl: `https://${databaseNamespace}.firebaseio.com`,
  sdkEmulator: '127.0.0.1:9000',
}));
const setupChecks = {
  'membership.uid.matchesFirebaseUid': membershipPath === `school_users/${schoolId}/${uid}`,
  'membership.active': writtenMembership?.active === true,
  'membership.role': writtenMembership?.role === testRole,
  'membership.allowedBusIds.busA': writtenMembership?.allowedBusIds?.busA === true,
  'trip.bus_id': writtenTrip?.bus_id === 'busA',
  'trip.status': writtenTrip?.status === 'in_progress',
  'trip.trip_id': writtenTrip?.trip_id === tripId,
};
const failedSetupChecks = Object.entries(setupChecks)
  .filter(([, valid]) => !valid)
  .map(([field]) => field);
if (failedSetupChecks.length > 0) {
  throw new Error(`Synthetic emulator setup mismatch in: ${failedSetupChecks.join(', ')}`);
}
const trip = ref(database, readPath);
const newTrip = transferMode ? ref(database, `active_trips/${newSchoolId}`) : null;
console.log(JSON.stringify({
  uid,
  databaseNamespace,
  membershipPath,
  tripPath,
  readPath,
  tokenOrigin: 'Laravel /api/firebase-token',
  client: 'Firebase JavaScript SDK',
  online: true,
}));

await get(trip);
console.log('pre-deactivation read: PASS');
if (transferMode) {
  await get(newTrip).then(() => { throw new Error('Pre-transfer new-school read unexpectedly succeeded.'); })
    .catch((error) => { if (!String(error?.message).toLowerCase().includes('permission')) throw error; console.log('pre-transfer new-school read: PASS (permission_denied)'); });
}

let listenerResult = 'NOT VERIFIED';
let listenerError;
const listenerDone = new Promise((resolve) => {
  const timeout = setTimeout(resolve, 5000);
  onValue(trip, () => {}, (error) => {
    listenerError = error.code;
    listenerResult = error.code === 'PERMISSION_DENIED' ? 'PASS' : `FAIL (${error.code})`;
    clearTimeout(timeout);
    resolve();
  });
});

let actionResponse;
const suspensionMode = process.env.SCHOOL_SUSPENSION_MODE === '1';
const deletedAdminMode = process.env.DELETED_ADMIN_MODE === '1';
const transferAction = transferMode;
const parentDeactivationMode = process.env.PARENT_DEACTIVATION_MODE === '1';
const actionMode = suspensionMode
  ? 'school-suspension-http'
  : deletedAdminMode
    ? 'deleted-admin-http'
    : transferAction
      ? 'school-transfer-http'
      : parentDeactivationMode
        ? 'parent-deactivation-php'
        : 'unset';
console.log(`action mode: ${actionMode}`);
if (suspensionMode || deletedAdminMode || transferAction) {
  if (!superAdminEmail || !superAdminPassword) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required for school suspension mode.');
  }
  const superAdminLogin = await json(await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: superAdminEmail, password: superAdminPassword, role: 'super_admin' }),
  }));
  console.log('Super Admin Laravel login: PASS');
  const endpoint = transferAction
    ? `${baseUrl}/api/super-admin/admins/${uid}`
    : deletedAdminMode
    ? `${baseUrl}/api/super-admin/admins/${uid}`
    : `${baseUrl}/api/super-admin/schools/${schoolId}/toggle-status`;
  actionResponse = await json(await fetch(endpoint, {
    method: transferAction ? 'PUT' : deletedAdminMode ? 'DELETE' : 'PATCH',
    headers: {
      authorization: `Bearer ${superAdminLogin.access_token}`,
      'content-type': 'application/json',
    },
    ...(transferAction
      ? { body: JSON.stringify({ name: 'Synthetic School Admin', email, phone: null, school_id: Number(newSchoolId), role: 'admin', status: 'active' }) }
      : deletedAdminMode ? {} : { body: JSON.stringify({ is_active: false }) }),
  }));
  console.log(`Laravel ${transferAction ? 'school transfer' : deletedAdminMode ? 'admin deletion' : 'school suspension'}: ${JSON.stringify(actionResponse)}`);
} else if (parentDeactivationMode) {
  const helper = process.env.DEACTIVATE_HELPER
    || new URL('./firebase-laravel-deactivate.php', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
  const phpBin = process.env.PHP_BIN || 'php';
  const windowsShell = process.env.ComSpec || process.env.COMSPEC;
  if (!windowsShell) throw new Error('ComSpec/COMSPEC is required for the Windows PHP helper.');
  const quoteWindowsArg = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const phpCommand = `${quoteWindowsArg(phpBin)} ${quoteWindowsArg(helper)}`;
  const deactivation = spawnSync(windowsShell, ['/d', '/s', '/c', phpCommand], {
    cwd: process.env.BACKEND_DIR || '../../bus-backend',
    env: process.env,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (deactivation.error) throw deactivation.error;
  if (deactivation.status !== 0) throw new Error(deactivation.stderr || deactivation.stdout);
  console.log(`Laravel deactivation: ${deactivation.stdout.trim()}`);
} else {
  throw new Error('Set SCHOOL_SUSPENSION_MODE=1, DELETED_ADMIN_MODE=1, TRANSFER_MODE=1, or PARENT_DEACTIVATION_MODE=1.');
}

const membershipAfterAction = await emulatorRequest(`school_users/${schoolId}/${uid}`);
console.log(`membership after Laravel action: ${JSON.stringify(membershipAfterAction)}`);
if (transferMode) {
  console.log(`new-school membership after Laravel action: ${JSON.stringify(await emulatorRequest(`school_users/${newSchoolId}/${uid}`))}`);
}

const freshRead = await get(trip)
  .then(() => 'FAIL (read unexpectedly succeeded)')
  .catch((error) => {
    const diagnostic = {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      string: String(error),
      toString: error?.toString?.(),
    };
    console.log(`fresh-read error: ${JSON.stringify(diagnostic)}`);
    const text = JSON.stringify(diagnostic).toLowerCase();
    return text.includes('permission_denied') || text.includes('permission denied')
      ? 'PASS (permission_denied)'
      : `FAIL (${diagnostic.code || diagnostic.message || 'unknown error'})`;
  });

await listenerDone;
console.log(`fresh server-backed read: ${freshRead}`);
console.log(`listener revocation: ${listenerResult}${listenerError ? ` (${listenerError})` : ''}`);
if (transferMode) {
  const newRead = await get(newTrip).then(() => 'PASS').catch((error) => `FAIL (${error?.message || 'unknown'})`);
  console.log(`new-school post-transfer read: ${newRead}`);
}
