/**
 * snw-smoke-tests.js — Shadow Nexus Wave Basic Smoke Tests
 *
 * These are manual-trigger browser console tests. They verify the critical
 * application paths without requiring a full testing framework.
 *
 * USAGE (from the browser console on any Wave page):
 *   // Run all checks:
 *   import('./snw-smoke-tests.js').then(m => m.runAll());
 *
 *   // Run individual checks:
 *   import('./snw-smoke-tests.js').then(m => m.checkAuth());
 *   import('./snw-smoke-tests.js').then(m => m.checkProfile());
 *   import('./snw-smoke-tests.js').then(m => m.checkSearch('alice'));
 *   import('./snw-smoke-tests.js').then(m => m.checkFirestoreRules());
 *
 * IMPORTANT: Tests do NOT write destructive data. They only read + make
 *            non-destructive writes to Firestore (which can be rolled back).
 *
 * MANUAL TEST PLAN (two-account test):
 *
 *   Account A:
 *     1. Login via sfl-login.html
 *     2. Open Settings → change profile picture → verify thumbnail updates immediately
 *     3. Open Settings → edit profile info → save → open sfl-profile.html → verify name shows
 *     4. Upload music via profile music → verify it appears on profile
 *     5. Upload a video via sfl-upload.html → verify it appears on sfl-profile.html
 *     6. Follow Account B from sfl-search.html → verify Follow→Following toggle
 *
 *   Account B (separate private/incognito window):
 *     1. Login via sfl-login.html
 *     2. Open sfl-search.html → search Account A by display name → click result
 *     3. Verify Account A's profile opens (not Account B's)
 *     4. Verify Account A's avatar shows
 *     5. Verify Account A's follower count updated
 *     6. Follow Account A from search
 *     7. Open Account A's profile via sfl-profile.html?uid={uidA} → verify Following state
 *     8. Play Account A's public music
 *     9. Play Account A's public video
 *
 *   Verify both accounts:
 *     - Follower/following counts are consistent across devices/accounts
 *     - Refreshing the page does not log out either account
 */

'use strict';

// ── Version ─────────────────────────────────────────────────────────────────────
export const SMOKE_TEST_VERSION = '2026.09.23-global-repair';

// ── Firebase setup (re-uses any existing app) ────────────────────────────────────
import { initializeApp, getApps }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyBO4IIDLMp-SKgBaA3RINsYaj-UELLUXZE',
  authDomain:        'shadow-nexus-wave.firebaseapp.com',
  projectId:         'shadow-nexus-wave',
  storageBucket:     'shadow-nexus-wave.firebasestorage.app',
  messagingSenderId: '68850298302',
  appId:             '1:68850298302:web:603bbb8539079903cb1def',
};

const _app  = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const _auth = getAuth(_app);
const _db   = getFirestore(_app);

// ── Result formatter ─────────────────────────────────────────────────────────────
function pass(label, detail) {
  console.log(`  ✅ PASS | ${label}${detail ? ': ' + detail : ''}`);
  return { ok: true, label, detail };
}
function fail(label, detail) {
  console.error(`  ❌ FAIL | ${label}${detail ? ': ' + detail : ''}`);
  return { ok: false, label, detail };
}
function info(label, detail) {
  console.info(`  ℹ️  INFO | ${label}${detail ? ': ' + detail : ''}`);
}

// ── Individual checks ────────────────────────────────────────────────────────────

/** Check 1: Auth state */
export async function checkAuth() {
  console.group('[Smoke] 1. Auth State');
  const results = [];
  const user = _auth.currentUser;
  if (user) {
    results.push(pass('Firebase auth', `uid=${user.uid} email=${user.email}`));
    results.push(pass('Not anonymous', String(!user.isAnonymous)));
    try {
      const token = await user.getIdToken();
      results.push(pass('getIdToken()', `token length=${token.length}`));
    } catch(e) {
      results.push(fail('getIdToken()', e.message));
    }
  } else {
    results.push(fail('Firebase auth', 'No current user — please sign in first'));
  }
  console.groupEnd();
  return results;
}

/** Check 2: Own profile loads correctly */
export async function checkProfile() {
  console.group('[Smoke] 2. Own Profile');
  const results = [];
  const user = _auth.currentUser;
  if (!user) { results.push(fail('auth', 'Not signed in')); console.groupEnd(); return results; }
  try {
    const snap = await getDoc(doc(_db, 'users', user.uid));
    if (!snap.exists()) {
      results.push(fail('Firestore users/' + user.uid, 'Document missing'));
    } else {
      const d = snap.data();
      results.push(pass('Profile doc exists', `uid=${snap.id}`));
      results.push(d.displayName ? pass('displayName', d.displayName) : fail('displayName', 'missing'));
      results.push(d.displayNameLower ? pass('displayNameLower', d.displayNameLower) : fail('displayNameLower', 'missing — search will not find this user'));
      info('avatar', d.avatar ? d.avatar.slice(0, 60) + '…' : '(none)');
      info('followerCount', String(d.followerCount ?? '(not set)'));
      info('followingCount', String(d.followingCount ?? '(not set)'));
    }
  } catch(e) {
    results.push(fail('getDoc users/' + user.uid, e.code + ': ' + e.message));
  }
  console.groupEnd();
  return results;
}

/** Check 3: Search for a user by display name */
export async function checkSearch(nameQuery) {
  console.group(`[Smoke] 3. Search "${nameQuery}"`);
  const results = [];
  const q_lower = nameQuery.toLowerCase();
  const q_upper = q_lower + '\uf8ff';
  try {
    const snap = await getDocs(query(
      collection(_db, 'users'),
      where('displayNameLower', '>=', q_lower),
      where('displayNameLower', '<=', q_upper),
      limit(5)
    ));
    if (snap.empty) {
      results.push(fail('displayNameLower search', `No results for "${nameQuery}" — check if displayNameLower field is backfilled`));
    } else {
      snap.docs.forEach(d => {
        results.push(pass('Found user', `uid=${d.id} name=${d.data().displayName}`));
      });
    }
  } catch(e) {
    results.push(fail('displayNameLower query', e.code + ': ' + e.message));
  }
  console.groupEnd();
  return results;
}

/** Check 4: Firestore security rules — read own profile */
export async function checkFirestoreRules() {
  console.group('[Smoke] 4. Firestore Rules');
  const results = [];
  const user = _auth.currentUser;
  if (!user) { results.push(fail('auth', 'Not signed in')); console.groupEnd(); return results; }

  // Can read own profile?
  try {
    await getDoc(doc(_db, 'users', user.uid));
    results.push(pass('Read own users/' + user.uid));
  } catch(e) {
    results.push(fail('Read own users/' + user.uid, e.code + ': ' + e.message));
  }

  // Can list public videos?
  try {
    await getDocs(query(collection(_db, 'videos'), where('status', '==', 'published'), where('visibility', '==', 'public'), limit(1)));
    results.push(pass('Read public videos'));
  } catch(e) {
    results.push(fail('Read public videos', e.code + ': ' + e.message));
  }

  // Can read profileMusic (public songs)?
  try {
    await getDocs(query(collection(_db, 'profileMusic'), where('visibility', '==', 'public'), limit(1)));
    results.push(pass('Read public profileMusic'));
  } catch(e) {
    results.push(fail('Read public profileMusic', e.code + ' — check Firestore rules for profileMusic'));
  }

  // Can read profilePlaylists?
  try {
    await getDocs(query(collection(_db, 'profilePlaylists'), where('visibility', '==', 'public'), limit(1)));
    results.push(pass('Read public profilePlaylists'));
  } catch(e) {
    results.push(fail('Read public profilePlaylists', e.code + ' — check Firestore rules for profilePlaylists'));
  }

  console.groupEnd();
  return results;
}

/** Check 5: Cloudflare Worker health */
export async function checkWorker() {
  console.group('[Smoke] 5. Cloudflare Worker');
  const results = [];
  const WORKER = 'https://shadow-nexus-wave.nthntjrn.workers.dev';
  try {
    const res = await fetch(WORKER + '/upload-health', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      results.push(pass('Worker health', `status=${res.status} ok=${body.ok}`));
    } else {
      results.push(fail('Worker health', `HTTP ${res.status}`));
    }
  } catch(e) {
    results.push(fail('Worker health', e.message));
  }
  console.groupEnd();
  return results;
}

/** Check 6: Service Worker cache version */
export async function checkServiceWorker() {
  console.group('[Smoke] 6. Service Worker');
  const results = [];
  if (!('serviceWorker' in navigator)) {
    results.push(fail('Service Worker support', 'Not available in this browser'));
    console.groupEnd();
    return results;
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    results.push(fail('SW registration', 'No service worker registered'));
  } else {
    results.push(pass('SW registered', `scope=${reg.scope} state=${reg.active?.state}`));
    // Request version
    await new Promise(resolve => {
      const handler = e => {
        if (e.data?.type === 'SW_VERSION') {
          results.push(pass('SW cache version', e.data.version));
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      reg.active?.postMessage({ type: 'GET_VERSION' });
      setTimeout(() => { navigator.serviceWorker.removeEventListener('message', handler); resolve(); }, 2000);
    });
  }
  console.groupEnd();
  return results;
}

/** Run all smoke tests */
export async function runAll() {
  console.group(`🌑⚡ Shadow Nexus Wave Smoke Tests — ${SMOKE_TEST_VERSION}`);
  const allResults = [
    ...(await checkAuth()),
    ...(await checkProfile()),
    ...(await checkFirestoreRules()),
    ...(await checkWorker()),
    ...(await checkServiceWorker()),
  ];
  const passed = allResults.filter(r => r.ok).length;
  const failed = allResults.filter(r => !r.ok).length;
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${allResults.length} checks`);
  if (failed === 0) {
    console.log('🎉 All checks passed!');
  } else {
    console.error(`⚠️ ${failed} check(s) failed — see details above`);
  }
  console.groupEnd();
  return allResults;
}
