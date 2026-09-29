/**
 * snx-profile.js — Shadow Nexus Wave
 * Centralized profile-name resolver.
 *
 * Priority order for snxGetDisplayName (highest to lowest):
 *   1. Firestore users/{uid}.displayName
 *   2. Firestore users/{uid}.username
 *   3. Firebase Auth user.displayName
 *   4. Firebase Auth email prefix
 *   5. Firestore users/{uid}.email prefix
 *   6. 'Wave User' (last resort — never 'User')
 *
 * Priority order for snxGetNameFromData (no Auth object available):
 *   1. Firestore users/{uid}.displayName
 *   2. Firestore users/{uid}.username
 *   3. Firestore users/{uid}.email prefix (stored on the document)
 *   4. 'Wave User' (last resort — never 'User')
 *
 * Usage (non-module pages — loaded via <script src="snx-profile.js">):
 *   window.snxGetDisplayName(profileDoc, authUser)
 *
 * Usage (ES module pages):
 *   import { snxGetDisplayName } from './snx-profile.js';
 */

/**
 * Resolve the best available display name for a user.
 *
 * @param {Object|null} profile  - Firestore users/{uid} document data
 * @param {Object|null} authUser - Firebase Auth user object
 * @returns {string} The best available display name, never empty.
 */
function snxGetDisplayName(profile, authUser) {
  return (
    profile?.displayName?.trim()                    ||
    profile?.username?.trim()                       ||
    authUser?.displayName?.trim()                   ||
    authUser?.email?.split('@')[0]?.trim()          ||
    profile?.email?.split('@')[0]?.trim()           ||
    'Wave User'
  );
}

/**
 * Resolve display name for a third-party user record fetched from Firestore.
 * This variant accepts only a plain data object (no Auth user).
 * Falls back to the stored email prefix before using the generic sentinel.
 *
 * @param {Object|null} userData - Plain Firestore user data object.
 * @returns {string}
 */
function snxGetNameFromData(userData) {
  return (
    userData?.displayName?.trim()          ||
    userData?.username?.trim()             ||
    userData?.email?.split('@')[0]?.trim() ||
    'Wave User'
  );
}

// Expose globally for non-module script contexts
if (typeof window !== 'undefined') {
  window.snxGetDisplayName  = snxGetDisplayName;
  window.snxGetNameFromData = snxGetNameFromData;
}

// Also support ES module import
export { snxGetDisplayName, snxGetNameFromData };
