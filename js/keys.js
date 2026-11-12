/**
 * HTML Studio standalone — access keys / passwords (with optional usernames).
 * ---------------------------------------------------------------------------
 * This single file holds EVERY key that locks the standalone studio.
 * Edit only this file to change, add, remove or disable keys.
 *
 * ────────────────────────────  SIMPLE  ────────────────────────────
 *  Each key is one line inside window.HS_KEYS below:
 *      { key: 'your-password', tier: 'admin', label: 'What this key unlocks', enabled: true }
 *  To add a username (optional): add a `username` field.
 *      { key: 'your-password', username: 'ada', tier: 'admin', label: 'Ada admin', enabled: true }
 *  When a username is set, BOTH the username AND the key must match to unlock.
 *  When no username is set, only the key is needed.
 *
 *  Tiers (pick one per key):
 *    owner — exclusive controls (reveal keys, wipe storage) + everything below
 *    admin — full access (every terminal command, plugins, export, settings)
 *    dev   — developer access (edit, run, format, import, export)
 *    guest — read-only access (look around, run the preview, no edits)
 *
 * ────────────────────────  DISABLING A KEY  ───────────────────────
 *  Flip one line and the key stops working — at the lock screen, in the
 *  Terminal, and for an already-unlocked session on the next reload:
 *
 *      { key: 'htmlstudio', tier: 'dev', label: 'Developer access', enabled: false }
 *
 *  Leave the line there (with enabled: false) so you can switch it back on
 *  later. `enabled: true`, or no `enabled` field at all, means the key works.
 *
 *  MASTER SWITCH — one line turns every key off at once:
 *      window.HS_KEYS_ENABLED = false;
 *  With the master switch off nobody can unlock the studio and the lock screen
 *  says so. Set it back to true to allow keys again. Nothing is deleted.
 *
 * ────────────────────────────  ADVANCED  ──────────────────────────
 *  • Keys are case-sensitive and trimmed. Usernames are case-insensitive.
 *  • Use long, random strings for real passwords, e.g. 'k7Qm2#vLp9!Xz'.
 *  • Two keys can share a tier — give each teammate their own key, same tier.
 *  • Higher tiers do NOT inherit lower ones; each key stands alone.
 *  • Access is role-based: each terminal command checks the minimum tier it
 *    needs (read / edit / admin / owner).
 *  • Every key owns its own key storage (js/keystorage.js). The storage script
 *    is named after the key, so each key's data is separate and downloadable.
 *  • The gate locks the WHOLE studio until any enabled key is entered.
 *  • Unlocking persists for the browser session (reload stays unlocked).
 *  • For a public deployment, change every default key below before publishing.
 *  • The React app keeps the same list in src/lib/studio/keys.js — keep them
 *    in sync if you publish both versions.
 * ---------------------------------------------------------------------------
 */

/* Master switch — false refuses every key, even the ones enabled below. */
window.HS_KEYS_ENABLED = true;

window.HS_KEYS = [
  { key: 'ng_studio_dVA9Y3yQy6gRyhHualr1wTeGreKOjoQJ',        tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: 'ng_studio_KoKVL6ZMyCfsGRvFvT0S3ngAirGdtc4t',        tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: 'ng_studio_QBk8yaFeLomZfElX2XLc6oGjMBs54N61',        tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: 'ng_studio_eAodIkSV2Qb4xMLJgP61MMEIxywGJLSu',        tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: 'ng_studio_IZWzL1VJNO9lAQCZI27s6EfrsR4k4UrK',        tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: 'ng_studio_2mszDW52aU8RLYrw2QIxuhpLESQTjGSO',        tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: 'ng_studio_bPnJxXKwSU0MsUbNcq59iuUB0EsZDAshVJJAXSMW',        tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: '9ZP0-528Q-LHEW-9LBL-LBYY-8J61-EU32-FVS8',   tier: 'dev',   label: 'Developer access',               enabled: true },
  { key: 'K0UV-5QLE-DE3V-4YZD-POP4-0UXJ-K8QY-QJQE',   tier: 'dev',   label: 'Developer access',               enabled: true },
  { key: 'UQXK-IQYN-GARM-5VYT-91YS-2POO-U1BS-8A0H',   tier: 'dev',   label: 'Developer access',               enabled: true },
  { key: 'JYCI-KYMH-3STK-ICLL-6YMS-UIUA-YFFU-2CQ2',   tier: 'dev',   label: 'Developer access',               enabled: true },
  { key: 'IBRP-AK22-8SPQ-BFHJ-50YM-396L-AHYA-8LGN',   tier: 'dev',   label: 'Developer access',               enabled: true },
  { key: 'htmlstudio2',   tier: 'dev',   label: 'Developer access',               enabled: true },
  { key: 'open-sesame',  tier: 'guest', label: 'Read-only access',               enabled: true },
  { key: 'studio-owner', username: 'owner', tier: 'owner', label: 'Owner — exclusive controls', enabled: true }
];

window.HS_KEYS_HELP = {
  simple: 'Edit js/keys.js — one line per key. Set enabled: false to switch a key off, or window.HS_KEYS_ENABLED = false to switch them all off.',
  tiers: 'Tiers: owner (exclusive + everything), admin (everything), dev (edit + run + export), guest (read-only). Each key stands alone.',
  file: 'Standalone: js/keys.js. React app: src/lib/studio/keys.js. Keep the two files in sync.'
};

// True when this key record is usable: the master switch is on and the key
// itself is not marked enabled: false.
window.HSKeyEnabled = function (k) {
  if (window.HS_KEYS_ENABLED === false) return false;
  return !!k && k.enabled !== false;
};

// Only the keys that can currently unlock the studio.
window.HSEnabledKeys = function () {
  return (window.HS_KEYS || []).filter(window.HSKeyEnabled);
};

// Validates a username + key pair. Disabled keys are refused. Returns the
// matching key record, or null.
window.validateKey = function (keyInput, usernameInput) {
  if (!keyInput || window.HS_KEYS_ENABLED === false) return null;
  var key = String(keyInput).trim();
  var username = usernameInput ? String(usernameInput).trim().toLowerCase() : '';
  for (var i = 0; i < (window.HS_KEYS || []).length; i += 1) {
    var k = window.HS_KEYS[i];
    if (!window.HSKeyEnabled(k)) continue;
    if (k.key !== key) continue;
    if (k.username) { if (k.username.toLowerCase() === username) return k; }
    else return k;
  }
  return null;
};

// Numeric rank for tier comparisons (higher = more access).
window.tierRank = function (tier) {
  return { guest: 1, dev: 2, admin: 3, owner: 4 }[tier] || 0;
};

// Permission thresholds — a tier grants a permission when its rank >= the minimum.
window.HS_PERMISSIONS = { read: 1, edit: 2, admin: 3, owner: 4 };

// Returns true if the current tier meets the minimum rank for a permission.
window.can = function (tier, perm) {
  return window.tierRank(tier) >= (window.HS_PERMISSIONS[perm] || 0);
};

// The ten exclusive powers of the owner key.
window.HS_OWNER_ABILITIES = [
  { id: 'reveal',    command: 'keys list',           label: 'Reveal all keys',        description: 'Show every access key, its tier, username and whether it is enabled.' },
  { id: 'wipe',      command: 'wipe',                label: 'Wipe everything',        description: 'Erase all local storage and reload the studio.' },
  { id: 'audit',     command: 'audit',               label: 'Session audit',          description: 'Full report of the active key, tier, storage and project.' },
  { id: 'purge',     command: 'purge <tier>',        label: 'Purge one key',          description: 'Clear the storage linked to a single key only.' },
  { id: 'broadcast', command: 'broadcast <message>', label: 'Studio broadcast',       description: 'Post a banner message everyone sees in the status bar.' },
  { id: 'seal',      command: 'seal',                label: 'Panic lock',             description: 'Instantly lock the studio and drop the current session.' },
  { id: 'backup',    command: 'backup',              label: 'Master backup',          description: 'Download every key storage plus the project in one file.' },
  { id: 'stats',     command: 'stats',               label: 'Storage totals',         description: 'See entries and bytes held by every key.' },
  { id: 'sudo',      command: 'sudo <tier>',         label: 'Impersonate a tier',     description: 'Temporarily view the studio as a lower tier.' },
  { id: 'purgeall',  command: 'purgeall',            label: 'Reset all storage',      description: 'Clear the storage of every key at once.' }
];
