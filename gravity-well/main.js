// Gravity Well — main.js
// App state machine (menu / plan / flight / result), level loading, the wells
// model + budget rules, prediction scheduling, the flight loop and all DOM glue.

import {
  PHYSICS_VERSION, DT, SHIP_RADIUS,
  killRadius, createState, step, predict, fieldAt, validateWells
} from './sim.js';
import * as Sim from './sim.js';
import { createInput } from './input.js';
import * as R from './render.js';
import * as Packs from './packs.js';
import { CAMPAIGN_PACK, CAMPAIGN_PACK_ID } from './campaign.js';

// ------------------------------------------------------------------ storage
//
// Progress is per pack (`gw.progress.<packId>`). Pre-pack saves under the bare
// `gw.progress` key are folded into the campaign's key once, on first load.

Packs.migrateLegacyProgress(CAMPAIGN_PACK_ID);

var pack = CAMPAIGN_PACK;                 // the pack currently being browsed
var packEntries = Packs.packLevels(pack); // flattened [{level, stage, ...}]
var progress = Packs.loadProgress(pack.id);

function saveProgress() {
  if (testMode.active) return;            // Test mode never writes progress
  Packs.saveProgress(pack.id, progress);
}

function selectPack(p) {
  pack = p;
  packEntries = Packs.packLevels(pack);
  progress = Packs.loadProgress(pack.id);
}

// --------------------------------------------------------------- test mode
//
// index.html?test=1 runs a level handed over by the editor through
// localStorage. No progress is written and the flight result is reported back.

var TEST_LEVEL_KEY = 'gw.editor.testLevel';
var TEST_WELLS_KEY = 'gw.editor.testWells';
var TEST_TRAIL_KEY = 'gw.editor.lastTrail';

var testMode = { active: false, level: null, wells: null };

function readTestMode() {
  var q;
  try { q = new URL(window.location.href).searchParams.get('test'); } catch (e) { q = null; }
  if (q !== '1') return;
  var raw = null, wellsRaw = null;
  try {
    raw = window.localStorage.getItem(TEST_LEVEL_KEY);
    wellsRaw = window.localStorage.getItem(TEST_WELLS_KEY);
  } catch (e) { /* storage blocked */ }
  if (!raw) return;
  try {
    testMode.level = JSON.parse(raw);
    testMode.active = !!(testMode.level && testMode.level.bounds);
  } catch (e) { testMode.active = false; }
  if (!testMode.active) return;
  if (wellsRaw) {
    try {
      var w = JSON.parse(wellsRaw);
      if (Array.isArray(w)) testMode.wells = w;
    } catch (e) { /* ignore */ }
  }
}

function writeTestResult() {
  if (!testMode.active) return;
  try {
    var trail = (app.trails && app.trails.ship) || [];
    var out = [];
    for (var i = 0; i < trail.length; i++) {
      out.push({ x: trail[i].x, y: trail[i].y, brk: !!trail[i].brk });
    }
    window.localStorage.setItem(TEST_TRAIL_KEY, JSON.stringify({
      levelId: app.level ? app.level.id : null,
      outcome: app.sim ? app.sim.outcome : null,
      reason: app.sim ? app.sim.reason : null,
      t: app.sim ? app.sim.t : 0,
      points: out
    }));
    window.localStorage.setItem(TEST_WELLS_KEY, JSON.stringify(app.wells));
  } catch (e) { /* storage blocked */ }
}

// ---------------------------------------------------------------- DOM refs

function $(id) { return document.getElementById(id); }

var el = {
  viewMenu: $('view-menu'),
  viewPlay: $('view-play'),
  menuList: $('menu-list'),
  resetProgress: $('btn-reset-progress'),
  packName: $('pack-name'),
  btnPacks: $('btn-packs'),
  packs: $('packs'),
  packsList: $('packs-list'),
  btnPacksClose: $('btn-packs-close'),
  btnImportPack: $('btn-import-pack'),
  importOverlay: $('import'),
  importText: $('import-text'),
  importFile: $('import-file'),
  importMsg: $('import-msg'),
  btnImportFile: $('btn-import-file'),
  btnImportCancel: $('btn-import-cancel'),
  btnImportGo: $('btn-import-go'),
  btnBackEditor: $('btn-back-editor'),
  btnInstall: $('btn-install'),
  canvas: $('game'),
  topbar: $('topbar'),
  bottombar: $('bottombar'),
  levelName: $('level-name'),
  closest: $('closest'),
  chargesUsed: $('charges-used'),
  chargesBudget: $('charges-budget'),
  charges: $('charges'),
  radio: $('radio'),
  radioText: $('radio-text'),
  planControls: $('plan-controls'),
  flightControls: $('flight-controls'),
  btnMenu: $('btn-menu'),
  btnReset: $('btn-reset'),
  btnPaste: $('btn-paste'),
  btnLaunch: $('btn-launch'),
  btnAbort: $('btn-abort'),
  btnSpeed: $('btn-speed'),
  flightTime: $('flight-time'),
  result: $('result'),
  resultCard: null,
  resultTitle: $('result-title'),
  resultBody: $('result-body'),
  resultBonus: $('result-bonus'),
  btnAdjust: $('btn-adjust'),
  btnCopy: $('btn-copy'),
  btnNext: $('btn-next'),
  toast: $('toast')
};
el.resultCard = el.result.querySelector('.result-card');

var ctx = el.canvas.getContext('2d');

// ------------------------------------------------------------------- state

var app = {
  mode: 'menu',          // 'menu' | 'plan' | 'flight' | 'result'
  level: null,
  levelIndex: -1,
  wells: [],
  planState: null,       // initial sim state, used to draw fixtures while planning
  sim: null,             // live sim state during flight
  pred: null,            // last prediction result
  arrows: [],
  view: null,
  dpr: 1,
  cssW: 0, cssH: 0,
  needsPredict: false,
  needsArrows: false,
  dragIndex: -1,
  speed: 1,
  flightT: 0,
  outcomeAt: -1,
  trails: null,          // {ship: [], byId: {}}
  markers: [],           // active tutorial world markers
  uiMarkerEl: null,      // DOM element a 'ui' marker is pointing at
  waypointTotal: 0,
  clock: 0,              // animation clock (seconds) for pulses/spins
  lastFrame: 0,
  rafId: 0
};

var ARROW_SPACING = 60;   // world units
var CAM_PAD = 80;         // world units of breathing room around out-of-bounds content
var CAM_MAX_ZOOM_OUT = 2.2; // never zoom out further than this vs. the base fit
var CAM_EASE = 5;         // exponential smoothing rate (1 - exp(-dt*CAM_EASE))
// Wells closer than this are rejected by validateWells, so the gestures never
// let the player build an invalid field in the first place.
var MIN_WELL_DISTANCE = Sim.MIN_WELL_DISTANCE != null ? Sim.MIN_WELL_DISTANCE : 100;
var TRAIL_MAX = 260;
var RESULT_DELAY = 0.6;   // seconds between outcome and overlay

// ------------------------------------------------------------------ helpers

function totalCharges(wells) {
  var n = 0;
  for (var i = 0; i < wells.length; i++) n += wells[i].charges;
  return n;
}

function clampToBounds(p, bounds) {
  p.x = Math.max(0, Math.min(bounds.w, p.x));
  p.y = Math.max(0, Math.min(bounds.h, p.y));
  return p;
}

var toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.toast.hidden = true; }, 1500);
}

// ------------------------------------------------------------------ sizing

function resize() {
  var cw = window.innerWidth || document.documentElement.clientWidth;
  var ch = window.innerHeight || document.documentElement.clientHeight;
  var dpr = Math.min(3, window.devicePixelRatio || 1);
  app.cssW = cw; app.cssH = ch; app.dpr = dpr;
  el.canvas.width = Math.max(1, Math.round(cw * dpr));
  el.canvas.height = Math.max(1, Math.round(ch * dpr));
  el.canvas.style.width = cw + 'px';
  el.canvas.style.height = ch + 'px';
  updateView();
}

function updateView() {
  if (!app.level) return;
  var top = el.topbar.getBoundingClientRect().height || 52;
  var bottom = el.bottombar.getBoundingClientRect().height || 70;
  app.pad = { top: top + 10, bottom: bottom + 10, left: 10, right: 10 };
  app.baseView = R.computeView(app.cssW, app.cssH, app.level.bounds, app.pad);
  // A resize snaps the camera rather than animating from a stale geometry.
  app.view = R.computeViewForRect(app.cssW, app.cssH, cameraRect(), app.pad, null);
  clampViewScale(app.view);
}

// ---------------------------------------------------------------- camera
//
// The camera rests on the base letterbox fit of the level bounds and only ever
// grows: in flight it opens up to keep a ship that has swung off the board in
// frame, and in planning it opens up to show the parts of the predicted path
// that leave the board. The zoom-out is capped, after which the edge chevron
// takes over.

function cameraRect() {
  var b = app.level.bounds;
  var x0 = 0, y0 = 0, x1 = b.w, y1 = b.h;
  function include(x, y) {
    if (x >= 0 && x <= b.w && y >= 0 && y <= b.h) return; // inside: no growth
    if (x - CAM_PAD < x0) x0 = x - CAM_PAD;
    if (x + CAM_PAD > x1) x1 = x + CAM_PAD;
    if (y - CAM_PAD < y0) y0 = y - CAM_PAD;
    if (y + CAM_PAD > y1) y1 = y + CAM_PAD;
  }

  if (app.mode === 'flight' || (app.mode === 'result' && app.sim)) {
    var sh = app.sim && app.sim.ship;
    if (sh && sh.alive !== false) include(sh.x, sh.y);
  } else if (app.pred && app.pred.ship) {
    var pts = app.pred.ship;
    for (var i = 0; i < pts.length; i++) include(pts[i].x, pts[i].y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function clampViewScale(v) {
  if (!app.baseView) return v;
  var minScale = app.baseView.scale / CAM_MAX_ZOOM_OUT;
  if (v.scale < minScale) {
    var fixed = R.computeViewForRect(app.cssW, app.cssH, cameraRect(), app.pad, minScale);
    v.scale = fixed.scale; v.ox = fixed.ox; v.oy = fixed.oy;
  }
  return v;
}

function updateCamera(dt) {
  if (!app.level || !app.view || !app.baseView) return;
  var target = clampViewScale(R.computeViewForRect(app.cssW, app.cssH, cameraRect(), app.pad, null));
  // Frame-rate independent exponential smoothing (~8%/frame at 60fps).
  var k = dt > 0 ? 1 - Math.exp(-dt * CAM_EASE) : 1;
  if (!(k > 0)) return;
  if (k > 1) k = 1;
  var v = app.view;
  v.scale += (target.scale - v.scale) * k;
  v.ox += (target.ox - v.ox) * k;
  v.oy += (target.oy - v.oy) * k;
  v.area = target.area;
}

// ------------------------------------------------------------------- menu
//
// Pack -> stage -> level. Unlock rules are per stage: required levels unlock in
// sequence across the pack, and a stage's optional (★) levels unlock once that
// stage's required levels are done.

function isOptional(lv) { return Packs.isOptional(lv); }

function entryAt(index) { return packEntries[index] || null; }

function indexOfLevelId(id) {
  for (var i = 0; i < packEntries.length; i++) {
    if (packEntries[i].level.id === id) return i;
  }
  return -1;
}

function isUnlocked(index) {
  var e = entryAt(index);
  if (!e) return false;
  if (isOptional(e.level)) {
    var levels = (e.stage && e.stage.levels) || [];
    for (var j = 0; j < levels.length; j++) {
      if (isOptional(levels[j])) continue;
      if (!progress.completed[levels[j].id]) return false;
    }
    return true;
  }
  for (var k = index - 1; k >= 0; k--) {
    if (isOptional(packEntries[k].level)) continue;
    return !!progress.completed[packEntries[k].level.id];
  }
  return true; // first required level in the pack
}

// Index of the next REQUIRED level after `index`, or -1.
function nextRequiredIndex(index) {
  for (var i = index + 1; i < packEntries.length; i++) {
    if (!isOptional(packEntries[i].level)) return i;
  }
  return -1;
}

function buildMenu() {
  el.packName.textContent = pack.name || pack.id;
  el.menuList.innerHTML = '';
  if (!packEntries.length) {
    var empty = document.createElement('p');
    empty.className = 'menu-empty';
    empty.textContent = 'This pack has no levels.';
    el.menuList.appendChild(empty);
    return;
  }
  var lastStage = null;
  for (var i = 0; i < packEntries.length; i++) {
    var e = packEntries[i];
    var lv = e.level;
    if (e.stage !== lastStage) {
      lastStage = e.stage;
      var h = document.createElement('div');
      h.className = 'phase-head';
      h.textContent = 'Stage ' + (e.stageIndex + 1) + ' \u2014 ' + (e.stage.title || e.stage.id);
      el.menuList.appendChild(h);
      if (e.stage.blurb) {
        var b = document.createElement('p');
        b.className = 'stage-blurb';
        b.textContent = e.stage.blurb;
        el.menuList.appendChild(b);
      }
    }
    var optional = isOptional(lv);
    var unlocked = isUnlocked(i);
    var done = !!progress.completed[lv.id];

    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'level-row' + (done ? ' done' : '') + (unlocked ? '' : ' locked') +
      (optional ? ' optional' : '');
    row.setAttribute('data-index', String(i));
    if (!unlocked) row.disabled = true;

    var idx = document.createElement('span');
    idx.className = 'lv-index';
    idx.textContent = optional ? '\u2605' : String(e.indexInStage + 1);

    var name = document.createElement('span');
    name.className = 'lv-name';
    name.textContent = unlocked ? lv.name : 'Locked';

    var mark = document.createElement('span');
    mark.className = 'lv-mark';
    mark.textContent = done ? '\u2713' : (unlocked ? '' : '\u2022');

    row.appendChild(idx);
    row.appendChild(name);
    row.appendChild(mark);
    row.addEventListener('click', onLevelRowClick);
    el.menuList.appendChild(row);
  }
}

function onLevelRowClick(e) {
  var i = parseInt(e.currentTarget.getAttribute('data-index'), 10);
  if (isNaN(i)) return;
  openLevel(i);
}

function showMenu() {
  app.mode = 'menu';
  app.level = null;
  el.result.hidden = true;
  el.radio.hidden = true;
  el.viewPlay.hidden = true;
  el.viewMenu.hidden = false;
  buildMenu();
}

// ------------------------------------------------------------- pack picker

function buildPackList() {
  var all = Packs.listPacks();
  el.packsList.innerHTML = '';
  for (var i = 0; i < all.length; i++) {
    var p = all[i];
    var levelCount = Packs.packLevels(p).length;
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '8px';
    wrap.style.alignItems = 'center';

    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'pack-row' + (p.id === pack.id ? ' current' : '');
    row.setAttribute('data-pack', p.id);
    var nm = document.createElement('span');
    nm.className = 'pk-name';
    nm.textContent = p.name || p.id;
    var meta = document.createElement('span');
    meta.className = 'pk-meta';
    meta.textContent = (p.builtIn ? 'built-in \u00b7 ' : '') +
      p.stages.length + ' stage' + (p.stages.length === 1 ? '' : 's') + ' \u00b7 ' + levelCount;
    row.appendChild(nm);
    row.appendChild(meta);
    row.addEventListener('click', onPackRowClick);
    wrap.appendChild(row);

    if (!p.builtIn) {
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'pack-remove';
      rm.setAttribute('data-pack', p.id);
      rm.setAttribute('aria-label', 'Remove ' + (p.name || p.id));
      rm.textContent = '\u2715';
      rm.addEventListener('click', onPackRemoveClick);
      wrap.appendChild(rm);
    }
    el.packsList.appendChild(wrap);
  }
}

function onPackRowClick(e) {
  var id = e.currentTarget.getAttribute('data-pack');
  var p = Packs.getPack(id);
  if (!p) return;
  selectPack(p);
  el.packs.hidden = true;
  buildMenu();
}

function onPackRemoveClick(e) {
  var id = e.currentTarget.getAttribute('data-pack');
  var p = Packs.getPack(id);
  if (!p) return;
  if (!window.confirm('Remove "' + (p.name || id) + '" and its progress?')) return;
  Packs.removePack(id);
  if (pack.id === id) selectPack(CAMPAIGN_PACK);
  buildPackList();
  buildMenu();
}

function openPacks() {
  buildPackList();
  el.packs.hidden = false;
}

function showImportMsg(text, ok) {
  el.importMsg.textContent = text;
  el.importMsg.className = 'import-msg' + (ok ? ' ok' : '');
  el.importMsg.hidden = !text;
}

function doImport(text) {
  var res = Packs.importPack(text);
  if (!res.ok) {
    showImportMsg('Could not import:\n\u2022 ' + res.errors.slice(0, 6).join('\n\u2022 '), false);
    return;
  }
  var msg = 'Imported "' + (res.pack.name || res.pack.id) + '".';
  if (res.warnings && res.warnings.length) msg += '\n' + res.warnings.join('\n');
  showImportMsg(msg, true);
  selectPack(res.pack);
  buildMenu();
  setTimeout(function () {
    el.importOverlay.hidden = true;
    el.packs.hidden = true;
  }, res.warnings && res.warnings.length ? 2200 : 700);
}

// -------------------------------------------------------------- level load

// Accepts an index into the current pack or a level id (searched in the current
// pack first, then across every pack, switching to it if found).
function openLevel(ref) {
  if (typeof ref === 'number') { startLevel(entryAt(ref) && entryAt(ref).level, ref); return; }
  if (typeof ref !== 'string') return;
  var i = indexOfLevelId(ref);
  if (i >= 0) { startLevel(packEntries[i].level, i); return; }
  var all = Packs.listPacks();
  for (var p = 0; p < all.length; p++) {
    var entries = Packs.packLevels(all[p]);
    for (var j = 0; j < entries.length; j++) {
      if (entries[j].level.id !== ref) continue;
      selectPack(all[p]);
      startLevel(packEntries[j].level, j);
      return;
    }
  }
}

// `index` is -1 for a level that is not part of a pack (test fixtures, and the
// editor's Test mode).
function startLevel(lv, index) {
  if (!lv) return;
  app.level = lv;
  app.levelIndex = index;
  app.wells = [];
  app.pred = null;
  app.sim = null;
  app.dragIndex = -1;
  app.speed = 1;
  app.flightT = 0;
  app.outcomeAt = -1;
  app.trails = { ship: [], byId: {} };
  app.planState = createState(lv, []);
  app.waypointTotal = R.waypointCount(lv);
  app.markers = [];

  progress.lastLevel = lv.id;
  saveProgress();

  el.viewMenu.hidden = true;
  el.viewPlay.hidden = false;
  el.result.hidden = true;
  el.levelName.textContent = lv.name;
  el.chargesBudget.textContent = String(lv.charges);
  el.btnSpeed.innerHTML = '1&times;';

  resize();
  enterPlan(true);
  fireTutorial('start');
}

// --------------------------------------------------------------- tutorial
//
// One pipeline for guidance. Modern levels carry `tutorial.steps`; older ones
// carry `radio` (messages) and `hint` (a well ghost), which are folded into the
// same step shape so everything downstream sees one list.

var radioTimer = 0;
var tutorialCache = { level: null, steps: null };

function tutorialSteps(lv) {
  if (!lv) return [];
  if (tutorialCache.level === lv) return tutorialCache.steps;
  var steps = [];
  if (lv.tutorial && Array.isArray(lv.tutorial.steps)) {
    steps = lv.tutorial.steps.slice(0);
  } else {
    var radio = lv.radio || [];
    for (var i = 0; i < radio.length; i++) {
      steps.push({ when: radio[i].when, text: radio[i].text, once: radio[i].once });
    }
    if (lv.hint && lv.hint.well) {
      // The old hint is a marker on the opening message, or its own start step.
      var attached = false;
      for (var j = 0; j < steps.length; j++) {
        if (steps[j].when === 'start' && !steps[j].marker) {
          steps[j] = {
            when: 'start', text: steps[j].text, once: steps[j].once,
            marker: { kind: 'well', x: lv.hint.well.x, y: lv.hint.well.y, charges: lv.hint.well.charges }
          };
          attached = true;
          break;
        }
      }
      if (!attached) {
        steps.unshift({
          when: 'start', text: '', once: false,
          marker: { kind: 'well', x: lv.hint.well.x, y: lv.hint.well.y, charges: lv.hint.well.charges }
        });
      }
    }
  }
  tutorialCache.level = lv;
  tutorialCache.steps = steps;
  return steps;
}

// A level is "guided" when it points at something, not merely when it talks.
function hasGuidance(lv) {
  if (!lv) return false;
  if (lv.hint && lv.hint.well) return true;
  var steps = tutorialSteps(lv);
  for (var i = 0; i < steps.length; i++) {
    if (steps[i] && steps[i].marker) return true;
  }
  return false;
}

function stepKey(levelId, when, index) { return levelId + ':' + when + ':' + index; }

function fireTutorial(when) {
  var lv = app.level;
  if (!lv) return;
  var steps = tutorialSteps(lv);
  for (var i = 0; i < steps.length; i++) {
    var st = steps[i];
    if (!st || st.when !== when) continue;
    var key = stepKey(lv.id, when, i);
    if (st.once && progress.radioSeen[key]) continue;
    if (st.once) { progress.radioSeen[key] = true; saveProgress(); }
    if (st.text) showRadio(st.text);
    applyMarker(st.marker);
    return;
  }
}

function applyMarker(marker) {
  clearUiMarkers();
  if (!marker) return;
  if (marker.kind === 'ui') {
    var target = marker.target === 'reset' ? el.btnReset
      : marker.target === 'charges' ? el.charges
      : el.btnLaunch;
    if (target) { target.classList.add('tut-target'); app.uiMarkerEl = target; }
    return;
  }
  app.markers = [marker];
}

function clearUiMarkers() {
  if (app.uiMarkerEl) { app.uiMarkerEl.classList.remove('tut-target'); app.uiMarkerEl = null; }
}

// World markers only make sense until the player has acted on them.
function clearWorldMarkers() { app.markers = []; }

function showRadio(text) {
  el.radioText.textContent = text;
  el.radio.hidden = false;
  if (radioTimer) clearTimeout(radioTimer);
  radioTimer = setTimeout(hideRadio, 6000);
}

function hideRadio() {
  el.radio.hidden = true;
  if (radioTimer) { clearTimeout(radioTimer); radioTimer = 0; }
}

// -------------------------------------------------------------- wells model

function markWellsChanged() {
  app.needsPredict = true;
  app.needsArrows = true;
  updateChargeReadout();
}

function updateChargeReadout() {
  if (!app.level) return;
  var used = totalCharges(app.wells);
  el.chargesUsed.textContent = String(used);
  if (used >= app.level.charges) el.charges.classList.add('full');
  else el.charges.classList.remove('full');
  // Tutorial: on guided levels, once a well exists, draw attention to Launch.
  if (hasGuidance(app.level) && app.mode === 'plan' && app.wells.length > 0) {
    el.btnLaunch.classList.add('btn-attention');
  } else {
    el.btnLaunch.classList.remove('btn-attention');
  }
}

// ---- placement rules ------------------------------------------------------
//
// Fixed wells and repulsors also reserve MIN_WELL_DISTANCE, and dead/allowed
// zones gate whole regions. The gestures enforce all of it live so the player
// can never build a field that validateWells would later reject.

function insideZone(fx, x, y) {
  if (!fx) return false;
  // The sim owns this test; only fall back when running against an older build.
  if (Sim.pointInZone) return Sim.pointInZone(fx, x, y);
  if (fx.shape === 'rect') {
    return x >= fx.x && x <= fx.x + (fx.w || 0) && y >= fx.y && y <= fx.y + (fx.h || 0);
  }
  if (fx.shape === 'poly') {
    var pts = fx.points || [];
    if (pts.length < 3) return false;
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var yi = pts[i].y, yj = pts[j].y;
      if ((yi > y) === (yj > y)) continue;
      var xAt = pts[i].x + ((y - yi) / (yj - yi)) * (pts[j].x - pts[i].x);
      if (x < xAt) inside = !inside;
    }
    return inside;
  }
  var dx = x - fx.x, dy = y - fx.y, r = fx.r || 0;
  return (dx * dx + dy * dy) <= r * r;
}

// Fixtures that reserve space around themselves (designer wells, repulsors).
function nearReservedFixture(x, y) {
  var fixtures = (app.level && app.level.fixtures) || [];
  for (var i = 0; i < fixtures.length; i++) {
    var fx = fixtures[i];
    if (!fx || (fx.type !== 'well' && fx.type !== 'repulsor')) continue;
    var dx = x - fx.x, dy = y - fx.y;
    if ((dx * dx + dy * dy) < MIN_WELL_DISTANCE * MIN_WELL_DISTANCE) return true;
  }
  return false;
}

// null when the point is placeable, otherwise the reason to show the player.
function placementProblem(x, y, skipWellIndex) {
  var fixtures = (app.level && app.level.fixtures) || [];
  var i, fx;
  for (i = 0; i < fixtures.length; i++) {
    fx = fixtures[i];
    if (fx && fx.type === 'deadZone' && insideZone(fx, x, y)) return "Can't place here";
  }
  var hasAllowed = false, inAllowed = false;
  for (i = 0; i < fixtures.length; i++) {
    fx = fixtures[i];
    if (!fx || fx.type !== 'allowedZone') continue;
    hasAllowed = true;
    if (insideZone(fx, x, y)) { inAllowed = true; break; }
  }
  if (hasAllowed && !inAllowed) return 'Only inside the marked zones';
  if (nearReservedFixture(x, y)) return 'Too close to a fixed well';
  if (nearestWell(x, y, MIN_WELL_DISTANCE, skipWellIndex == null ? -1 : skipWellIndex) >= 0) {
    return 'Wells must be ' + MIN_WELL_DISTANCE + ' units apart';
  }
  return null;
}

// Index of the nearest well within `dist` of (wx, wy), ignoring `skip`, else -1.
function nearestWell(wx, wy, dist, skip) {
  var best = -1, bestD = dist;
  for (var i = 0; i < app.wells.length; i++) {
    if (i === skip) continue;
    var dx = wx - app.wells[i].x, dy = wy - app.wells[i].y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function handleTap(wx, wy, index) {
  if (app.mode !== 'plan') return;
  var lv = app.level;
  var used = totalCharges(app.wells);
  // A tap too close to an existing well could not legally place a new one, so
  // read it as "grow that well" — which is almost certainly what was meant.
  if (index < 0) index = nearestWell(wx, wy, MIN_WELL_DISTANCE, -1);
  if (index >= 0) {
    var w = app.wells[index];
    if (w.charges >= lv.stackLimit) { toast('Max stack'); return; }
    if (used >= lv.charges) { toast('No charges left'); return; }
    w.charges += 1;
  } else {
    if (used >= lv.charges) { toast('No charges left'); return; }
    var p = clampToBounds({ x: wx, y: wy }, lv.bounds);
    var problem = placementProblem(p.x, p.y, -1);
    if (problem) { toast(problem); return; }
    app.wells.push({ x: p.x, y: p.y, charges: 1 });
    clearWorldMarkers();
    if (app.wells.length === 1) fireTutorial('firstWell');
  }
  markWellsChanged();
}

// Double-tap removes the well outright, which also reverts the +1 that the
// first tap of the pair already applied (and refunds the whole stack).
function handleDoubleTap(wx, wy, index) {
  if (app.mode !== 'plan') return;
  if (index < 0) return;
  app.wells.splice(index, 1);
  markWellsChanged();
}

function handleDragStart(index) {
  app.dragIndex = index;
  app.dragBlocked = false;
}

function handleDragMove(index, wx, wy) {
  if (app.mode !== 'plan') return;
  var w = app.wells[index];
  if (!w) return;
  var p = clampToBounds({ x: wx, y: wy }, app.level.bounds);
  // Too close to a neighbour, inside a dead zone, or outside the allowed zones:
  // hold the well where it was. It sticks and tints red rather than nagging.
  if (placementProblem(p.x, p.y, index)) {
    app.dragBlocked = true;
    return;
  }
  app.dragBlocked = false;
  w.x = p.x; w.y = p.y;
  markWellsChanged();
}

function handleDragEnd() {
  app.dragIndex = -1;
  app.dragBlocked = false;
}

// ------------------------------------------------------- prediction / field

// Every gravity source the field sees: designer wells, repulsors (negative
// charges, so the same formula pushes), then the player's wells — the same
// order createState() builds state.sources in.
function fieldSources() {
  var out = [];
  var fixtures = (app.level && app.level.fixtures) || [];
  var i, fx, n;
  for (i = 0; i < fixtures.length; i++) {
    fx = fixtures[i];
    if (!fx || fx.type !== 'well') continue;
    n = Math.max(1, Math.round(fx.charges || 1));
    out.push({ x: fx.x, y: fx.y, charges: n, r: killRadius(n) });
  }
  for (i = 0; i < fixtures.length; i++) {
    fx = fixtures[i];
    if (!fx || fx.type !== 'repulsor') continue;
    n = Math.max(1, Math.round(fx.charges || 1));
    out.push({ x: fx.x, y: fx.y, charges: -n, r: 0 });
  }
  for (i = 0; i < app.wells.length; i++) {
    out.push({ x: app.wells[i].x, y: app.wells[i].y, charges: app.wells[i].charges });
  }
  return out;
}

function recomputeArrows() {
  var lv = app.level;
  if (!lv) return;
  var sources = fieldSources();
  var out = [];
  for (var y = ARROW_SPACING / 2; y < lv.bounds.h; y += ARROW_SPACING) {
    for (var x = ARROW_SPACING / 2; x < lv.bounds.w; x += ARROW_SPACING) {
      var skip = false;
      for (var i = 0; i < sources.length; i++) {
        // Inside a lethal core there is nothing to advise about. Repulsors have
        // no core (r = 0), so they never blank out their own neighbourhood.
        var kr = (sources[i].charges > 0 ? killRadius(sources[i].charges) : 0) + 6;
        var dx = x - sources[i].x, dy = y - sources[i].y;
        if (dx * dx + dy * dy <= kr * kr) { skip = true; break; }
      }
      if (skip) continue;
      var f = fieldAt(sources, x, y);
      // Outside every source's reach the field is exactly zero; skipping those
      // samples is what makes the bounded field visible.
      if (f.ax === 0 && f.ay === 0) continue;
      out.push({ x: x, y: y, ax: f.ax, ay: f.ay });
    }
  }
  app.arrows = out;
  app.needsArrows = false;
}

function recomputePrediction() {
  app.needsPredict = false;
  var lv = app.level;
  if (!lv || !lv.previewSeconds) { app.pred = null; updateClosestReadout(); return; }
  try {
    app.pred = predict(lv, app.wells, lv.previewSeconds);
  } catch (e) {
    app.pred = null;
  }
  updateClosestReadout();
}

function updateClosestReadout() {
  var ca = app.pred && app.pred.closestApproach;
  if (!ca || app.mode === 'flight') { el.closest.hidden = true; return; }
  el.closest.hidden = false;
  el.closest.textContent = 'closest ' + Math.round(ca.dist) + 'u @ ' + ca.t.toFixed(1) + 's';
  if (ca.dist < 60) el.closest.classList.remove('safe');
  else el.closest.classList.add('safe');
}

// ------------------------------------------------------------ mode changes

function enterPlan(fresh) {
  app.mode = 'plan';
  app.sim = null;
  app.outcomeAt = -1;
  el.result.hidden = true;
  el.planControls.hidden = false;
  el.flightControls.hidden = true;
  el.closest.hidden = true;
  if (fresh) app.trails = { ship: [], byId: {} };
  markWellsChanged();
  recomputeArrows();
  recomputePrediction();
}

function launch() {
  if (app.mode !== 'plan') return;
  var v = validateWells(app.level, app.wells);
  if (!v.ok) { toast(v.message || v.reason || 'Invalid placement'); return; }
  app.sim = createState(app.level, app.wells);
  app.trails = { ship: [], byId: {} };
  app.flightT = 0;
  app.accumulator = 0;
  app.eventCursor = 0;
  app.outcomeAt = -1;
  app.mode = 'flight';
  el.planControls.hidden = true;
  el.flightControls.hidden = false;
  el.closest.hidden = true;
  el.btnLaunch.classList.remove('btn-attention');
  clearWorldMarkers();
  clearUiMarkers();
  hideRadio();
  fireTutorial('launch');
}

function abort() {
  if (app.mode !== 'flight') return;
  enterPlan(true);
}

function toggleSpeed() {
  app.speed = app.speed === 1 ? 2 : 1;
  el.btnSpeed.innerHTML = app.speed + '&times;';
}

// ------------------------------------------------------------ flight loop

function stepFlight(dtSeconds) {
  var s = app.sim;
  if (!s) return;
  if (s.outcome) return;
  var cap = app.speed === 2 ? 16 : 8;
  app.accumulator += dtSeconds * app.speed;
  var steps = 0;
  while (app.accumulator >= DT && steps < cap && !s.outcome) {
    step(s);
    app.accumulator -= DT;
    steps++;
  }
  if (app.accumulator > DT * cap) app.accumulator = DT * cap; // don't spiral
  app.flightT = s.t;
  recordTrails(s);
  if (s.outcome && app.outcomeAt < 0) app.outcomeAt = app.clock;
}

// Ids that went through a wormhole since the last sample; their next trail
// point starts a new stroke instead of being joined across the jump.
function teleportedSince(s) {
  var set = {};
  var evs = s.events || [];
  var from = app.eventCursor || 0;
  for (var i = from; i < evs.length; i++) {
    if (evs[i].kind === 'teleport') set[evs[i].id] = true;
  }
  app.eventCursor = evs.length;
  return set;
}

function recordTrails(s) {
  var tr = app.trails;
  var jumped = teleportedSince(s);
  if (s.ship && s.ship.alive !== false) {
    tr.ship.push({ x: s.ship.x, y: s.ship.y, brk: !!jumped[s.ship.id || 'ship'] });
    if (tr.ship.length > TRAIL_MAX) tr.ship.shift();
  }
  for (var i = 0; i < s.bodies.length; i++) {
    var b = s.bodies[i];
    if (b.alive === false) continue;
    if (b.static || b.type === 'obstacle' || b.type === 'oreReceiver' || b.type === 'wormhole') continue;
    var list = tr.byId[b.id];
    if (!list) { list = tr.byId[b.id] = []; }
    list.push({ x: b.x, y: b.y, brk: !!jumped[b.id] });
    if (list.length > TRAIL_MAX) list.shift();
  }
}

// ------------------------------------------------------------------ result

var FAIL_TEXT = {
  well: 'The ship fell into a gravity well. Wells steer — they do not carry.',
  obstacle: 'The ship struck a static obstacle.',
  asteroid: 'The ship struck an asteroid. Check the time markers, not just the crossing.',
  drone: 'A drone intercepted the ship.',
  hunter: 'A hunter ran the ship down.',
  lost: 'The ship left the operating area and is gone.',
  drift: 'Fuel-less drift. The ship never reached the target.'
};

function showResult() {
  var s = app.sim;
  app.mode = 'result';
  el.planControls.hidden = true;
  el.flightControls.hidden = true;
  var win = s && s.outcome === 'win';
  el.resultCard.className = 'result-card ' + (win ? 'win' : 'fail');
  el.resultTitle.textContent = win ? 'Target reached' : 'Mission lost';
  el.resultBody.textContent = win
    ? 'Flight time ' + s.t.toFixed(1) + 's using ' + totalCharges(app.wells) + ' of ' + app.level.charges + ' charges.'
    : (FAIL_TEXT[s && s.reason] || 'The attempt ended.') + ' Adjust the field and try again.';

  var delivered = s ? (s.oreDelivered || 0) : 0;
  var lost = s ? (s.oreLost || 0) : 0;
  if (delivered || lost) {
    el.resultBonus.hidden = false;
    el.resultBonus.textContent = 'Ore: ' + delivered + ' delivered, ' + lost + ' lost.';
  } else {
    el.resultBonus.hidden = true;
  }

  el.btnNext.hidden = !win || testMode.active || nextRequiredIndex(app.levelIndex) < 0;

  if (win) {
    progress.completed[app.level.id] = true;
    saveProgress();
  }
  el.result.hidden = false;
  writeTestResult();
  fireTutorial(win ? 'win' : 'fail');
}

// ------------------------------------------------------ solution clipboard

function fmt(n) { return String(Math.round(n * 1000) / 1000); }

function encodeSolution() {
  var parts = [];
  for (var i = 0; i < app.wells.length; i++) {
    var w = app.wells[i];
    parts.push(fmt(w.x) + ',' + fmt(w.y) + ',' + w.charges);
  }
  return PHYSICS_VERSION + '|' + app.level.id + '|' + parts.join(';');
}

function copySolution() {
  var text = encodeSolution();
  var done = function () { toast('Solution copied'); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this solution:', text); });
  } else {
    window.prompt('Copy this solution:', text);
  }
}

function pasteSolution() {
  var text = window.prompt('Paste a solution code:', '');
  if (!text) return;
  var parts = String(text).trim().split('|');
  if (parts.length < 3) { toast('Unreadable code'); return; }
  if (parts[0] !== PHYSICS_VERSION) {
    // Solutions are only reproducible under the physics they were flown on.
    toast('Solution is for physics ' + parts[0] + '; this build is ' + PHYSICS_VERSION);
    return;
  }
  if (parts[1] !== app.level.id) { toast('Code is for ' + parts[1]); return; }
  var wells = [];
  var chunks = parts[2] ? parts[2].split(';') : [];
  for (var i = 0; i < chunks.length; i++) {
    if (!chunks[i]) continue;
    var f = chunks[i].split(',');
    if (f.length < 3) { toast('Unreadable code'); return; }
    var x = parseFloat(f[0]), y = parseFloat(f[1]), n = parseInt(f[2], 10);
    if (!isFinite(x) || !isFinite(y) || !(n > 0)) { toast('Unreadable code'); return; }
    wells.push({ x: x, y: y, charges: n });
  }
  var v = validateWells(app.level, wells);
  if (!v.ok) { toast(v.message || v.reason || 'Invalid solution'); return; }
  app.wells = wells;
  markWellsChanged();
  toast('Solution loaded');
}

// ------------------------------------------------------------------ drawing

function draw() {
  if (!app.level || !app.view) return;
  var lv = app.level, view = app.view;
  ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
  R.drawBackground(ctx, lv.id, app.cssW, app.cssH, app.dpr);
  R.drawBounds(ctx, view, lv.bounds);

  var flying = app.mode === 'flight' || (app.mode === 'result' && app.sim);
  var s = flying ? app.sim : app.planState;

  ctx.save();
  if (flying) ctx.globalAlpha = 0.55;
  R.drawFieldArrows(ctx, view, app.arrows, { spacing: ARROW_SPACING });
  ctx.restore();

  var passed = waypointsPassed(s);
  R.drawLevelFixtures(ctx, view, lv, app.clock, {
    flight: flying,
    waypointsPassed: passed,
    killRadiusFn: killRadius
  });
  R.drawBodies(ctx, view, s.bodies, app.clock, s.ship);
  // A moving target lives on the state; fall back to the level's own position.
  var targetNow = (s && s.target) ? s.target : lv.target;
  R.drawTarget(ctx, view, targetNow, app.clock, {
    dimmed: app.waypointTotal > 0 && passed < app.waypointTotal
  });

  if (!flying) {
    drawPlanPreview(view, lv);
  } else {
    drawFlightTrails(view);
  }

  R.drawWells(ctx, view, app.wells, killRadius, { selected: app.dragIndex, dim: flying });
  drawDragBlockedTint(view);

  if (s.ship && s.ship.alive !== false) {
    R.drawShip(ctx, view, s.ship, SHIP_RADIUS, { showVelocity: !flying });
    if (flying) R.drawOutOfBoundsMarker(ctx, view, s.ship, lv.bounds);
  }

  if (!flying) drawTutorialMarkers(view);
}

// How many waypoints the ship has cleared, as reported by the sim (0 for a sim
// build that does not know about waypoints yet).
function waypointsPassed(s) {
  if (!s) return 0;
  if (typeof s.waypointsPassed === 'number') return s.waypointsPassed;
  if (typeof s.nextWaypoint === 'number') return Math.max(0, s.nextWaypoint - 1);
  return 0;
}

// Tutorial markers placed in the world: a ghost well to copy, or a spot to look
// at. 'ui' markers are a CSS class on a button instead and need no drawing.
function drawTutorialMarkers(view) {
  var markers = app.markers || [];
  for (var i = 0; i < markers.length; i++) {
    var m = markers[i];
    if (!m) continue;
    if (m.kind === 'well') {
      if (app.wells.length > 0) continue; // already acted on
      R.drawHint(ctx, view, m, app.clock);
      R.drawWells(ctx, view, [{ x: m.x, y: m.y, charges: m.charges || 1 }], killRadius,
        { selected: -1, dim: true });
    } else if (m.kind === 'point') {
      R.drawHint(ctx, view, m, app.clock);
    }
  }
}

// Subtle red ring on the dragged well while it is being held off a neighbour.
function drawDragBlockedTint(view) {
  if (!app.dragBlocked || app.dragIndex < 0) return;
  var w = app.wells[app.dragIndex];
  if (!w) return;
  var cx = R.wx2sx(view, w.x), cy = R.wy2sy(view, w.y);
  var kr = killRadius(w.charges) * view.scale;
  ctx.save();
  ctx.strokeStyle = R.COLORS.bad;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(cx, cy, kr, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = R.COLORS.bad;
  ctx.beginPath(); ctx.arc(cx, cy, kr, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlanPreview(view, lv) {
  var pred = app.pred;
  if (!pred) return;
  if (lv.showBodyPreview && pred.bodies) {
    for (var id in pred.bodies) {
      if (!Object.prototype.hasOwnProperty.call(pred.bodies, id)) continue;
      R.drawTrajectory(ctx, view, pred.bodies[id], { bright: false });
    }
  }
  // A patrolling target gets its own faint predicted track with time ticks, so
  // the player can compare arrival times the same way as for any other mover.
  if (pred.target && pred.target.length > 1) {
    R.drawTrajectory(ctx, view, pred.target, { bright: false, color: R.COLORS.target });
  }
  var end = null;
  if (pred.outcome === 'win') end = 'ring';
  else if (pred.outcome === 'fail') end = 'x';
  R.drawTrajectory(ctx, view, pred.ship, { bright: true, endMark: end });

  var ca = pred.closestApproach;
  if (ca) {
    var other = pathForId(pred, ca);
    if (other) R.drawClosestApproach(ctx, view, pred.ship, other, ca);
  }
}

// The closest approach may be to a well (id 'wellN'), which has no sampled
// path because it never moves — synthesise a one-point path for it.
function pathForId(pred, ca) {
  if (pred.bodies && pred.bodies[ca.id]) return pred.bodies[ca.id];
  var m = /^well(\d+)$/.exec(ca.id);
  if (m) {
    var w = app.wells[parseInt(m[1], 10)];
    if (w) return [{ t: ca.t, x: w.x, y: w.y }];
  }
  return null;
}

function drawFlightTrails(view) {
  var tr = app.trails;
  for (var id in tr.byId) {
    if (!Object.prototype.hasOwnProperty.call(tr.byId, id)) continue;
    R.drawTrail(ctx, view, tr.byId[id], '#7d8ba8', 1.2);
  }
  R.drawTrail(ctx, view, tr.ship, R.COLORS.ship, 2);
}

// --------------------------------------------------------------- main loop

function frame(nowMs) {
  app.rafId = window.requestAnimationFrame(frame);
  var dt = app.lastFrame ? (nowMs - app.lastFrame) / 1000 : 0;
  app.lastFrame = nowMs;
  if (dt > 0.25) dt = 0.25;
  app.clock += dt;

  if (app.mode === 'menu' || !app.level) return;

  if (app.needsArrows) recomputeArrows();
  if (app.needsPredict) recomputePrediction();

  if (app.mode === 'flight') {
    stepFlight(dt);
    el.flightTime.textContent = app.flightT.toFixed(1) + 's';
    if (app.sim && app.sim.outcome && app.outcomeAt >= 0 && (app.clock - app.outcomeAt) >= RESULT_DELAY) {
      showResult();
    }
  }

  updateCamera(dt);
  draw();
}

function startLoop() {
  if (app.rafId) return;
  app.lastFrame = 0;
  app.rafId = window.requestAnimationFrame(frame);
}

function stopLoop() {
  if (!app.rafId) return;
  window.cancelAnimationFrame(app.rafId);
  app.rafId = 0;
}

// ------------------------------------------------------------------- wiring

createInput(el.canvas, {
  getView: function () { return app.view; },
  getWells: function () { return app.wells; },
  enabled: function () { return app.mode === 'plan'; },
  onTap: handleTap,
  onDoubleTap: handleDoubleTap,
  onDragStart: handleDragStart,
  onDragMove: handleDragMove,
  onDragEnd: handleDragEnd
});

el.btnMenu.addEventListener('click', showMenu);
el.btnReset.addEventListener('click', function () {
  app.wells = [];
  markWellsChanged();
});
el.btnPaste.addEventListener('click', pasteSolution);
el.btnLaunch.addEventListener('click', launch);
el.btnAbort.addEventListener('click', abort);
el.btnSpeed.addEventListener('click', toggleSpeed);
el.btnAdjust.addEventListener('click', function () { enterPlan(true); });
el.btnCopy.addEventListener('click', copySolution);
el.btnNext.addEventListener('click', function () {
  var n = nextRequiredIndex(app.levelIndex);
  if (n >= 0) openLevel(n);
  else showMenu();
});
el.radio.addEventListener('click', hideRadio);
el.resetProgress.addEventListener('click', function () {
  if (!window.confirm('Erase progress for "' + (pack.name || pack.id) + '"?')) return;
  progress = { completed: {}, radioSeen: {}, lastLevel: null };
  Packs.saveProgress(pack.id, progress);
  buildMenu();
});

el.btnPacks.addEventListener('click', openPacks);
el.btnPacksClose.addEventListener('click', function () { el.packs.hidden = true; });
el.btnImportPack.addEventListener('click', function () {
  el.importText.value = '';
  showImportMsg('', false);
  el.importOverlay.hidden = false;
});
el.btnImportCancel.addEventListener('click', function () { el.importOverlay.hidden = true; });
el.btnImportGo.addEventListener('click', function () {
  var text = (el.importText.value || '').trim();
  if (!text) { showImportMsg('Paste some JSON first, or choose a file.', false); return; }
  doImport(text);
});
el.btnImportFile.addEventListener('click', function () { el.importFile.click(); });
el.importFile.addEventListener('change', function () {
  var f = el.importFile.files && el.importFile.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function () {
    el.importText.value = String(reader.result || '');
    doImport(el.importText.value);
  };
  reader.onerror = function () { showImportMsg('Could not read that file.', false); };
  reader.readAsText(f);
  el.importFile.value = '';
});

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

document.addEventListener('visibilitychange', function () {
  if (document.hidden) stopLoop();
  else startLoop();
});

// --------------------------------------------------------- PWA / installing

// Register the service worker after load so it never competes with the first
// paint. Failure is non-fatal: without it the game is simply a normal page.
function registerServiceWorker() {
  navigator.serviceWorker.register('./sw.js').catch(function () { /* offline unavailable */ });
}

if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker);
}

// Chromium fires beforeinstallprompt when the app qualifies for installation.
// Stash the event and reveal the Install button in the menu footer; browsers
// that never fire it (and already-installed instances) keep it hidden.
var installPrompt = null;

window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  installPrompt = e;
  el.btnInstall.hidden = false;
});

window.addEventListener('appinstalled', function () {
  installPrompt = null;
  el.btnInstall.hidden = true;
});

el.btnInstall.addEventListener('click', function () {
  var deferred = installPrompt;
  installPrompt = null;
  el.btnInstall.hidden = true;
  if (deferred) deferred.prompt();
});

// Expose a tiny surface for the smoke tests / debugging. Read-only in spirit.
window.GW = {
  get mode() { return app.mode; },
  get wells() { return app.wells; },
  get level() { return app.level; },
  get view() { return app.view; },
  get baseView() { return app.baseView; },
  get pack() { return pack; },
  get testMode() { return testMode.active; },
  // Accepts an index into the current pack or a level id.
  openLevel: openLevel,
  // Load a level object directly, for tests and debugging.
  loadLevel: function (lv) { startLevel(lv, -1); },
  selectPack: function (id) {
    var p = Packs.getPack(id);
    if (!p) return false;
    selectPack(p);
    buildMenu();
    return true;
  }
};

// ------------------------------------------------------------------- boot

readTestMode();

if (testMode.active) {
  // Editor hand-off: no menu, no progress, and a way back.
  el.btnBackEditor.hidden = false;
  el.btnMenu.hidden = true;
  document.title = 'Gravity Well — test';
  startLevel(testMode.level, -1);
  if (testMode.wells && testMode.wells.length) {
    var seeded = [];
    for (var ti = 0; ti < testMode.wells.length; ti++) {
      var tw = testMode.wells[ti];
      if (tw && isFinite(tw.x) && isFinite(tw.y)) {
        seeded.push({ x: tw.x, y: tw.y, charges: Math.max(1, Math.round(tw.charges || 1)) });
      }
    }
    app.wells = seeded;
    markWellsChanged();
  }
} else {
  showMenu();
}

resize();
startLoop();
