/**
 * snw-config.js — Shadow Nexus Wave Global Configuration
 *
 * Single source of truth for:
 *   - Application version (must match sw.js CACHE_VERSION and GitHub Actions)
 *   - Cloudflare Worker URL (all pages must use WAVE_WORKER_URL from here)
 *   - Firebase project config (public web config, NOT private service account)
 *
 * Import (ES module pages):
 *   import { WAVE_WORKER_URL, SHADOW_WAVE_VERSION, WAVE_FIREBASE_CONFIG } from './snw-config.js';
 *
 * Access globally (non-module pages that load this via <script src="snw-config.js">):
 *   window.WAVE_WORKER_URL
 *   window.SHADOW_WAVE_VERSION
 *   window.WAVE_FIREBASE_CONFIG
 *
 * SECURITY NOTE:
 *   WAVE_FIREBASE_CONFIG contains only the public Web API key, which is safe to
 *   expose in client-side code — it is not a service account or admin credential.
 *   Private secrets (API tokens, Cloudflare credentials, service account keys) are
 *   stored exclusively as Cloudflare Worker secrets; they never appear in this file.
 */

// ── Application version ────────────────────────────────────────────────────────
// Must match sw.js CACHE_VERSION (snw-v{version}) and GitHub Actions deploy checks.
export const SHADOW_WAVE_VERSION = '2026.09.23-global-repair';

// ── Cloudflare Worker URL ──────────────────────────────────────────────────────
// Wave-only worker (shadow-nexus-wave). DO NOT use yellow-term-11e6 (Social worker).
export const WAVE_WORKER_URL = 'https://shadow-nexus-wave.nthntjrn.workers.dev';

// ── Firebase project configuration (Wave — shadow-nexus-wave) ─────────────────
// Public web config — safe for client-side use.
// DO NOT use the Social project config (horr-a08f4) on Wave pages.
export const WAVE_FIREBASE_CONFIG = {
  apiKey:            'AIzaSyBO4IIDLMp-SKgBaA3RINsYaj-UELLUXZE',
  authDomain:        'shadow-nexus-wave.firebaseapp.com',
  databaseURL:       'https://shadow-nexus-wave-default-rtdb.firebaseio.com',
  projectId:         'shadow-nexus-wave',
  storageBucket:     'shadow-nexus-wave.firebasestorage.app',
  messagingSenderId: '68850298302',
  appId:             '1:68850298302:web:603bbb8539079903cb1def',
};

// ── Global exposure for non-module scripts ─────────────────────────────────────
if (typeof window !== 'undefined') {
  window.SHADOW_WAVE_VERSION    = SHADOW_WAVE_VERSION;
  window.WAVE_WORKER_URL        = WAVE_WORKER_URL;
  window.WAVE_FIREBASE_CONFIG   = WAVE_FIREBASE_CONFIG;
}
