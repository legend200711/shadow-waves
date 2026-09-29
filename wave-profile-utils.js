/**
 * wave-profile-utils.js — Shadow Nexus Wave
 *
 * Central profile ensure/repair utilities.
 *
 * Firebase project: shadow-nexus-wave  (NEVER horr-a08f4)
 *
 * Usage (ES module):
 *   import { ensureUserProfile, repairUserProfile } from './wave-profile-utils.js';
 *
 * ensureUserProfile(user, db)
 *   - After every successful authentication.
 *   - Creates users/{user.uid} if missing.
 *   - If it exists, repairs only missing required fields without overwriting existing data.
 *   - Returns the final Firestore profile data object.
 *
 * repairMissingFields(uid, data, db)
 *   - Low-level helper used internally. Not intended for direct page use.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const LOG_PROFILE = (...a) => console.log('[Wave Profile]', ...a);
const LOG_REPAIR  = (...a) => console.log('[Wave Profile Repair]', ...a);

/**
 * Build the default profile structure for a given Firebase Auth user.
 * Called when no Firestore document exists yet.
 *
 * @param {import('firebase/auth').User} user
 * @returns {Object}
 */
function buildDefaultProfile(user) {
  const fallbackName = (
    user.displayName?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'Wave User'
  );
  return {
    uid:              user.uid,
    displayName:      fallbackName,
    displayNameLower: fallbackName.toLowerCase(),
    username:         '',
    email:            user.email || '',
    avatar:           user.photoURL || '',
    bio:              '',
    role:             'member',
    followers:        [],
    following:        [],
    followerCount:    0,
    followingCount:   0,
    isLive:           false,
    liveRoomId:       null,
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
  };
}

/**
 * Compute any missing/broken fields that need repairing on an existing profile.
 * NEVER overwrites a field that already has a valid value.
 *
 * @param {string} uid        - The Firebase Auth UID (= Firestore document ID)
 * @param {Object} data       - Existing Firestore document data
 * @param {import('firebase/auth').User} user - Firebase Auth user (for fallbacks)
 * @returns {Object|null}     - Object of fields to write, or null if nothing needed
 */
function computeRepairFields(uid, data, user) {
  const repairs = {};

  // uid field must match document ID
  if (!data.uid) {
    repairs.uid = uid;
    LOG_REPAIR('uid field missing — adding uid =', uid);
  }

  // displayName
  if (!data.displayName) {
    const fallback = user.displayName?.trim() || user.email?.split('@')[0]?.trim() || 'Wave User';
    repairs.displayName = fallback;
    LOG_REPAIR('displayName missing — setting to', fallback);
  }

  // displayNameLower — must always equal displayName.toLowerCase()
  const effectiveName = repairs.displayName || data.displayName || '';
  if (effectiveName && !data.displayNameLower) {
    repairs.displayNameLower = effectiveName.toLowerCase();
    LOG_REPAIR('displayNameLower missing — generating from displayName');
  }

  // email
  if (!data.email && user.email) {
    repairs.email = user.email;
    LOG_REPAIR('email missing — adding from Auth');
  }

  // followers array
  if (!Array.isArray(data.followers)) {
    repairs.followers = [];
    LOG_REPAIR('followers missing — initializing []');
  }

  // following array
  if (!Array.isArray(data.following)) {
    repairs.following = [];
    LOG_REPAIR('following missing — initializing []');
  }

  // followerCount — derive from array if missing
  if (data.followerCount == null) {
    repairs.followerCount = Array.isArray(data.followers)
      ? data.followers.length
      : (repairs.followers ? 0 : 0);
    LOG_REPAIR('followerCount missing — deriving from followers.length =', repairs.followerCount);
  }

  // followingCount — derive from array if missing
  if (data.followingCount == null) {
    repairs.followingCount = Array.isArray(data.following)
      ? data.following.length
      : (repairs.following ? 0 : 0);
    LOG_REPAIR('followingCount missing — deriving from following.length =', repairs.followingCount);
  }

  // role
  if (!data.role) {
    repairs.role = 'member';
    LOG_REPAIR('role missing — defaulting to "member"');
  }

  // username — normalize to lowercase if present but not lowercased
  if (data.username && data.username !== data.username.toLowerCase()) {
    repairs.username = data.username.toLowerCase();
    LOG_REPAIR('username not lowercase — normalizing');
  }

  // If any repairs needed, always set updatedAt
  if (Object.keys(repairs).length > 0) {
    repairs.updatedAt = serverTimestamp();
  }

  return Object.keys(repairs).length > 0 ? repairs : null;
}

/**
 * Ensure users/{user.uid} exists and is complete.
 *
 * - If the document is missing: creates it from Auth data.
 * - If the document exists: repairs only missing required fields.
 * - Never overwrites: username, bio, avatar, followers, following, role, or
 *   any other field that already has a valid value.
 *
 * @param {import('firebase/auth').User} user - Firebase Auth user (must not be anonymous)
 * @param {import('firebase/firestore').Firestore} db
 * @returns {Promise<Object>}  The final Firestore profile data
 */
export async function ensureUserProfile(user, db) {
  if (!user || user.isAnonymous) return null;

  const uid     = user.uid;
  const userRef = doc(db, 'users', uid);

  LOG_PROFILE('ensureUserProfile uid:', uid);

  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // Profile doc completely missing — create it now
      const profile = buildDefaultProfile(user);
      LOG_REPAIR('Firestore profile missing for uid:', uid, '— creating now');
      await setDoc(userRef, profile);
      LOG_REPAIR('Firestore profile created for uid:', uid);
      return profile;
    }

    // Profile exists — repair missing fields only
    const data    = snap.data();
    const repairs = computeRepairFields(uid, data, user);

    if (repairs) {
      LOG_REPAIR('Repairing', Object.keys(repairs).length, 'field(s) on uid:', uid, Object.keys(repairs));
      await updateDoc(userRef, repairs);
      // Return merged data
      return { ...data, ...repairs };
    }

    LOG_PROFILE('Profile complete for uid:', uid);
    return data;

  } catch (err) {
    if (err.code === 'permission-denied') {
      console.error('[Wave Profile] ensureUserProfile permission-denied for uid:', uid);
    } else {
      console.error('[Wave Profile] ensureUserProfile failed for uid:', uid, err.code, err.message);
    }
    return null;
  }
}
