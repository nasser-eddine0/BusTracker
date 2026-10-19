import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);

const required = [
  'FIREBASE_SMOKE_PROJECT_ID',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_CREDENTIALS',
  'FIREBASE_WEB_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_SMOKE_CONFIRM',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required smoke-test variables: ${missing.join(', ')}`);
if (process.env.FIREBASE_SMOKE_CONFIRM !== 'I_UNDERSTAND_TEST_PROJECT') {
  throw new Error('FIREBASE_SMOKE_CONFIRM must equal I_UNDERSTAND_TEST_PROJECT.');
}

const projectId = process.env.FIREBASE_SMOKE_PROJECT_ID;
const databaseUrl = process.env.FIREBASE_DATABASE_URL;
const credentials = process.env.FIREBASE_CREDENTIALS;
const productionProject = process.env.FIREBASE_PRODUCTION_PROJECT_ID;
if (productionProject && projectId === productionProject) throw new Error('Refusing to run against the configured production project.');
if (!/^bustracker-smoke-[a-z0-9-]+$/i.test(projectId) || /prod|production/i.test(projectId)) {
  throw new Error('Refusing to run: project ID is not an explicitly named BusTracker smoke-test project.');
}
if (!databaseUrl.startsWith('https://') || /127\.0\.0\.1|localhost/i.test(databaseUrl)) {
  throw new Error('Refusing to run: FIREBASE_DATABASE_URL must be the HTTPS URL of the real smoke-test project.');
}
if (!existsSync(credentials)) throw new Error('FIREBASE_CREDENTIALS does not point to an existing file.');

process.env.APP_ENV = 'testing';
process.env.FIREBASE_SYNC_DRIVER = 'kreait';
const runId = `smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
const cleanupHelper = process.env.FIREBASE_SMOKE_CLEANUP_HELPER || 'database/seeders/Phase23SmokeCleanup.php';
const cleanup = () => {
  const uid = process.env.FIREBASE_SMOKE_FIREBASE_UID;
  const schoolId = process.env.FIREBASE_SMOKE_SCHOOL_ID;
  if (!uid || !schoolId) return;
  const result = spawnSync(process.env.PHP_BIN || 'php', [cleanupHelper], {
    cwd: process.env.BACKEND_DIR || '../../bus-backend',
    env: { ...process.env, FIREBASE_SMOKE_CONFIRM: 'I_UNDERSTAND_TEST_PROJECT', FIREBASE_SMOKE_DRY_RUN: '0' },
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.error || result.status !== 0) {
    console.error(`CLEANUP_FAIL path=school_users/${schoolId}/${uid}`);
    if (result.stderr) console.error(result.stderr.trim());
    process.exitCode = 1;
    return false;
  }
  console.log(result.stdout.trim());
  return true;
};
process.on('uncaughtException', (error) => {
  console.error(`SMOKE_FAIL ${error.message}`);
  cleanup();
});
process.on('unhandledRejection', (error) => {
  console.error(`SMOKE_FAIL ${error?.message || error}`);
  cleanup();
});
console.log(JSON.stringify({
  status: 'PREFLIGHT_OK',
  projectId,
  databaseHost: new URL(databaseUrl).host,
  credentials: 'present (not displayed)',
  firebaseSyncDriver: process.env.FIREBASE_SYNC_DRIVER,
  runId,
  syntheticPrefix: `bustracker/${runId}`,
  emulator: false,
}));

if (process.argv.includes('--execute')) {
  const laravelUrl = process.env.LARAVEL_URL || 'http://127.0.0.1:8099';
  const smokeEmail = process.env.FIREBASE_SMOKE_USER_EMAIL;
  const smokePassword = process.env.FIREBASE_SMOKE_USER_PASSWORD;
  const superEmail = process.env.FIREBASE_SMOKE_SUPER_ADMIN_EMAIL;
  const superPassword = process.env.FIREBASE_SMOKE_SUPER_ADMIN_PASSWORD;
  const schoolId = process.env.FIREBASE_SMOKE_SCHOOL_ID;
  const userId = process.env.FIREBASE_SMOKE_USER_ID;
  const protectedPath = process.env.FIREBASE_SMOKE_PROTECTED_PATH;
  if (!smokeEmail || !smokePassword || !superEmail || !superPassword || !schoolId || !userId || !protectedPath) {
    throw new Error('Execute mode requires fixture IDs/credentials plus FIREBASE_SMOKE_PROTECTED_PATH for a protected RTDB read.');
  }
  const { initializeApp } = require('firebase/app');
  const { getAuth, signInWithCustomToken } = require('firebase/auth');
  const { get, getDatabase, ref } = require('firebase/database');
  const app = initializeApp({
    apiKey: process.env.FIREBASE_WEB_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: databaseUrl,
  });
  const auth = getAuth(app);
  const api = async (path, options = {}) => {
    const response = await fetch(`${laravelUrl}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
    const body = await response.json();
    if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
    return body;
  };
  const login = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: smokeEmail, password: smokePassword, role: 'admin' }) });
  const token = await api('/api/firebase-token', { headers: { authorization: `Bearer ${login.access_token}` } });
  await signInWithCustomToken(auth, token.firebaseToken);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Firebase Auth did not return a UID.');
  if (uid !== String(userId)) throw new Error('Firebase UID does not match the temporary SQLite fixture user.');
  process.env.FIREBASE_SMOKE_FIREBASE_UID = uid;
  const db = getDatabase(app);
  const membershipPath = `school_users/${schoolId}/${uid}`;
  console.log(JSON.stringify({ diagnostic: 'before-membership-read', laravelUserId: userId, firebaseUid: uid, projectId, databaseHost: new URL(databaseUrl).host, canonicalMembershipPath: membershipPath }));
  const membership = await get(ref(db, membershipPath));
  console.log(JSON.stringify({ diagnostic: 'membership-read-back', canonicalMembershipPath: membershipPath, value: membership.val() }));
  if (membership.val()?.active !== true) throw new Error('Kreait membership projection was not active before deactivation.');
  const superLogin = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: superEmail, password: superPassword, role: 'super_admin' }) });
  const deactivationPath = `/api/super-admin/schools/${schoolId}/toggle-status`;
  const deactivationResponse = await fetch(`${laravelUrl}${deactivationPath}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${superLogin.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ is_active: false }),
  });
  const deactivationBody = await deactivationResponse.json();
  console.log(JSON.stringify({ diagnostic: 'laravel-deactivation', endpoint: deactivationPath, method: 'PATCH', status: deactivationResponse.status, response: deactivationBody }));
  if (!deactivationResponse.ok) throw new Error(`Laravel deactivation failed with HTTP ${deactivationResponse.status}.`);
  const membershipAfter = await get(ref(db, membershipPath));
  const activeAfter = membershipAfter.val()?.active === true;
  console.log(JSON.stringify({ diagnostic: 'membership-after-deactivation', canonicalMembershipPath: membershipPath, value: membershipAfter.val(), activeAfter }));
  if (activeAfter) throw new Error('Laravel deactivation did not produce active:false in the real RTDB.');
  let protectedReadDenied = false;
  try {
    await get(ref(db, protectedPath));
  } catch (error) {
    const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    protectedReadDenied = text.includes('permission_denied') || text.includes('permission denied');
    console.log(JSON.stringify({ diagnostic: 'same-session-protected-read', path: protectedPath, error: error?.code || error?.message || 'unknown', denied: protectedReadDenied }));
  }
  if (!protectedReadDenied) throw new Error('Same-session protected read was not denied after deactivation.');
  const cleanupSucceeded = cleanup();
  if (!cleanupSucceeded) throw new Error('Smoke cleanup failed.');
  console.log(JSON.stringify({ status: 'EXECUTE_PASS', projectId, runId, laravel: 'real HTTP', token: 'generated and exchanged; not displayed', membershipPath, activeBefore: membership.val()?.active === true, activeAfter, protectedReadDenied: true, cleanupSucceeded }));
} else {
  console.log('No Firebase request was made by preflight. Use --execute only from the dedicated local smoke-project PowerShell session.');
}
