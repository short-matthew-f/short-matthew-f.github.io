// Gravity Well — packs.js
// Level packs: validation, localStorage storage for imported packs, and the
// per-pack progress keys. No DOM here, so node tests can import it directly.
//
// Storage layout
//   gw.packs                imported packs, as an array of pack objects
//   gw.progress.<packId>    {completed:{}, radioSeen:{}, lastLevel}
//   gw.progress             legacy single-campaign progress, migrated once

import { PHYSICS_VERSION } from './sim.js';
import { CAMPAIGN_PACK, CAMPAIGN_PACK_ID } from './campaign.js';

export var PACK_FORMAT = 'gw-pack-1';
export var PACKS_KEY = 'gw.packs';
export var LEGACY_PROGRESS_KEY = 'gw.progress';
export var PROGRESS_PREFIX = 'gw.progress.';

var ID_RE = /^[A-Za-z0-9][A-Za-z0-9 _.:-]{0,63}$/;

export function progressKey(packId) { return PROGRESS_PREFIX + packId; }

// --------------------------------------------------------------- validation

function isNum(v) { return typeof v === 'number' && isFinite(v); }
function isStr(v) { return typeof v === 'string' && v.length > 0; }

function checkLevel(lv, where, errors, seenIds) {
  if (!lv || typeof lv !== 'object') { errors.push(where + ': level is not an object'); return; }
  var label = where + (isStr(lv.id) ? ' (' + lv.id + ')' : '');

  if (!isStr(lv.id)) errors.push(where + ': level needs a non-empty string id');
  else if (seenIds[lv.id]) errors.push(label + ': duplicate level id');
  else seenIds[lv.id] = true;

  if (!isStr(lv.name)) errors.push(label + ': level needs a name');
  if (!lv.bounds || !isNum(lv.bounds.w) || !isNum(lv.bounds.h) || lv.bounds.w <= 0 || lv.bounds.h <= 0) {
    errors.push(label + ': bounds must be {w>0, h>0}');
  }
  if (!isNum(lv.charges) || lv.charges < 0 || lv.charges !== Math.round(lv.charges)) {
    errors.push(label + ': charges must be a whole number >= 0');
  }
  if (!isNum(lv.stackLimit) || lv.stackLimit < 1 || lv.stackLimit !== Math.round(lv.stackLimit)) {
    errors.push(label + ': stackLimit must be a whole number >= 1');
  }
  if (!lv.ship || !isNum(lv.ship.x) || !isNum(lv.ship.y)) errors.push(label + ': ship needs numeric x and y');
  if (!lv.target || !isNum(lv.target.x) || !isNum(lv.target.y) || !isNum(lv.target.r) || lv.target.r <= 0) {
    errors.push(label + ': target needs numeric x, y and r > 0');
  }
  if (lv.fixtures != null && !Array.isArray(lv.fixtures)) errors.push(label + ': fixtures must be an array');
  if (lv.solution != null && !Array.isArray(lv.solution)) errors.push(label + ': solution must be an array');
  if (lv.radio != null && !Array.isArray(lv.radio)) errors.push(label + ': radio must be an array');
  if (lv.tutorial != null) {
    if (typeof lv.tutorial !== 'object' || !Array.isArray(lv.tutorial.steps)) {
      errors.push(label + ': tutorial must be {steps:[...]}');
    }
  }
}

// Returns {ok, errors, warnings}. `errors` is what makes a pack unusable;
// `warnings` are things worth telling the player about (a physics mismatch
// means shared solutions will not reproduce, but the pack still plays).
export function validatePack(json) {
  var errors = [];
  var warnings = [];
  var pack = json;

  if (typeof pack === 'string') {
    try { pack = JSON.parse(pack); }
    catch (e) { return { ok: false, errors: ['not valid JSON: ' + e.message], warnings: warnings, pack: null }; }
  }
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return { ok: false, errors: ['pack must be a JSON object'], warnings: warnings, pack: null };
  }
  if (pack.format !== PACK_FORMAT) {
    errors.push('format must be "' + PACK_FORMAT + '" (got ' + JSON.stringify(pack.format) + ')');
  }
  if (!isStr(pack.id) || !ID_RE.test(pack.id)) errors.push('pack needs a simple non-empty id');
  if (!isStr(pack.name)) errors.push('pack needs a name');
  if (pack.physicsVersion != null && pack.physicsVersion !== PHYSICS_VERSION) {
    warnings.push('pack was authored for physics ' + pack.physicsVersion +
      '; this build is ' + PHYSICS_VERSION + ' — authored solutions may not reproduce');
  }

  if (!Array.isArray(pack.stages) || pack.stages.length === 0) {
    errors.push('pack needs at least one stage');
  } else {
    var seenIds = {};
    var seenStages = {};
    var levelCount = 0;
    for (var i = 0; i < pack.stages.length; i++) {
      var st = pack.stages[i];
      var where = 'stage ' + (i + 1);
      if (!st || typeof st !== 'object') { errors.push(where + ': not an object'); continue; }
      if (!isStr(st.id)) errors.push(where + ': needs a non-empty string id');
      else if (seenStages[st.id]) errors.push(where + ': duplicate stage id ' + st.id);
      else seenStages[st.id] = true;
      if (!isStr(st.title)) errors.push(where + ': needs a title');
      if (!Array.isArray(st.levels)) { errors.push(where + ': levels must be an array'); continue; }
      for (var j = 0; j < st.levels.length; j++) {
        checkLevel(st.levels[j], where + ' level ' + (j + 1), errors, seenIds);
        levelCount++;
      }
    }
    if (levelCount === 0) errors.push('pack contains no levels');
  }

  return { ok: errors.length === 0, errors: errors, warnings: warnings, pack: errors.length === 0 ? pack : null };
}

// ------------------------------------------------------------------ helpers

// Flatten a pack to [{level, stage, stageIndex, indexInStage, index}] in order.
export function packLevels(pack) {
  var out = [];
  if (!pack || !Array.isArray(pack.stages)) return out;
  for (var s = 0; s < pack.stages.length; s++) {
    var st = pack.stages[s];
    var levels = (st && st.levels) || [];
    for (var i = 0; i < levels.length; i++) {
      out.push({
        level: levels[i], stage: st, stageIndex: s, indexInStage: i, index: out.length
      });
    }
  }
  return out;
}

export function isOptional(level) { return !!(level && level.optional); }

// --------------------------------------------------------------- storage

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
}
function safeRemove(key) {
  try { window.localStorage.removeItem(key); return true; } catch (e) { return false; }
}

// Imported packs only — the campaign is built in and never stored.
export function loadImportedPacks() {
  var raw = safeGet(PACKS_KEY);
  if (!raw) return [];
  var list;
  try { list = JSON.parse(raw); } catch (e) { return []; }
  if (!Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var v = validatePack(list[i]);
    if (v.ok) out.push(list[i]);
  }
  return out;
}

export function saveImportedPacks(list) {
  return safeSet(PACKS_KEY, JSON.stringify(list || []));
}

// Built-in campaign first, then imported packs in insertion order.
export function listPacks() {
  return [CAMPAIGN_PACK].concat(loadImportedPacks());
}

export function getPack(id) {
  var all = listPacks();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}

// Import (or replace) a pack. Accepts an object or a JSON string.
export function importPack(jsonOrText) {
  var v = validatePack(jsonOrText);
  if (!v.ok) return v;
  if (v.pack.id === CAMPAIGN_PACK_ID) {
    return { ok: false, errors: ['"' + CAMPAIGN_PACK_ID + '" is the built-in pack id; rename the pack'], warnings: v.warnings, pack: null };
  }
  var list = loadImportedPacks();
  var replaced = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === v.pack.id) { list[i] = v.pack; replaced = true; break; }
  }
  if (!replaced) list.push(v.pack);
  if (!saveImportedPacks(list)) {
    return { ok: false, errors: ['could not save the pack (storage unavailable)'], warnings: v.warnings, pack: null };
  }
  return { ok: true, errors: [], warnings: v.warnings, pack: v.pack, replaced: replaced };
}

export function removePack(id) {
  if (id === CAMPAIGN_PACK_ID) return false;
  var list = loadImportedPacks();
  var out = [];
  var found = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { found = true; continue; }
    out.push(list[i]);
  }
  if (!found) return false;
  saveImportedPacks(out);
  safeRemove(progressKey(id));
  return true;
}

// --------------------------------------------------------------- progress

function emptyProgress() { return { completed: {}, radioSeen: {}, lastLevel: null }; }

export function loadProgress(packId) {
  var raw = safeGet(progressKey(packId));
  if (!raw) return emptyProgress();
  var p;
  try { p = JSON.parse(raw); } catch (e) { return emptyProgress(); }
  if (!p || typeof p !== 'object') return emptyProgress();
  return {
    completed: p.completed || {},
    radioSeen: p.radioSeen || {},
    lastLevel: p.lastLevel == null ? null : p.lastLevel
  };
}

export function saveProgress(packId, progress) {
  return safeSet(progressKey(packId), JSON.stringify(progress || emptyProgress()));
}

// Move pre-pack progress onto the campaign's key, exactly once. The legacy key
// is left in place (harmless, and it keeps an older build working if someone
// downgrades); the presence of the new key is what stops it repeating.
export function migrateLegacyProgress(packId) {
  var target = progressKey(packId || CAMPAIGN_PACK_ID);
  if (safeGet(target) != null) return false;
  var legacy = safeGet(LEGACY_PROGRESS_KEY);
  if (legacy == null) return false;
  var p;
  try { p = JSON.parse(legacy); } catch (e) { return false; }
  if (!p || typeof p !== 'object') return false;
  return safeSet(target, JSON.stringify({
    completed: p.completed || {},
    radioSeen: p.radioSeen || {},
    lastLevel: p.lastLevel == null ? null : p.lastLevel
  }));
}
