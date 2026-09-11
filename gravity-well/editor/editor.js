// Gravity Well — editor/editor.js
//
// The editor's entry point and the one place that owns mutable state:
// the working pack, which stage/level is open, the selection, the undo stack,
// the autosave timer and the analysis worker.
//
// Wiring
// ------
//   editor.js  — state, undo/redo, autosave, top bar, keyboard, Test round trip
//   canvas.js  — camera, hit testing, handles, placement tools, belt brush
//   panel.js   — the six tabs and every form control
//   tools.js   — pure data: canonical JSON, validation, belts, pack surgery
//   analyse.worker.js — sim-heavy analysis, off the UI thread
//
// canvas.js and panel.js never import this module; they are handed the `app`
// object below, which is the whole contract between them. That keeps the
// module graph a tree and makes every state change go through one door.
//
// Storage keys (shared with the game, which owns index.html):
//   gw.editor.pack      the working pack, autosaved 300 ms after every change
//   gw.editor.cursor    {stageIndex, levelIndex} so a reload reopens the level
//   gw.editor.testLevel the level handed to index.html?test=1
//   gw.editor.testWells wells to preload into the test, and what comes back
//   gw.editor.lastTrail the ghost trail of the last test flight
//
// Mobile-Safari rules: no structuredClone, no Array.prototype.at, no lookbehind.

import * as T from './tools.js';
import { createEditorCanvas, isPolyTool } from './canvas.js';
import { createPanel } from './panel.js';

var LS_PACK = 'gw.editor.pack';
var LS_CURSOR = 'gw.editor.cursor';
var LS_TEST_LEVEL = 'gw.editor.testLevel';
var LS_TEST_WELLS = 'gw.editor.testWells';
var LS_TRAIL = 'gw.editor.lastTrail';
var LS_PACKS = 'gw.packs';

var AUTOSAVE_MS = 300;
var HISTORY_CAP = 100;

// --------------------------------------------------------------- storage

function lsGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* private mode / full */ }
}
function lsJSON(key) {
  var raw = lsGet(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// ------------------------------------------------------------------ state

var pack = null;
var restored = lsJSON(LS_PACK);
if (restored && T.validatePack(restored).ok) pack = restored;
if (!pack) pack = T.newPack();

var cursor = lsJSON(LS_CURSOR) || { stageIndex: 0, levelIndex: 0 };

var app = {
  pack: pack,
  stageIndex: 0,
  levelIndex: 0,
  sel: [],
  tool: 'select',
  stickyTool: false,
  multiSelect: false,
  pickMode: null,
  tutorialPreview: false,
  ghost: null,
  overlay: { hotzone: null, wells: null, path: null, pathEnd: null, tolerance: null },
  beltSettings: { kind: 'obstacle', width: 120, density: 1, rMin: 16, rMax: 34, seed: 1, vx: 0, vy: 0 },
  analyseSettings: { charges: 1, step: 24, samples: 3000, floor: 40 },
  analyseHtml: '',
  analyseFamilies: null
};

app.stageIndex = clampIndex(cursor.stageIndex, pack.stages.length);
app.levelIndex = clampIndex(cursor.levelIndex, (pack.stages[app.stageIndex].levels || []).length);

function clampIndex(i, len) {
  var n = typeof i === 'number' && isFinite(i) ? Math.floor(i) : 0;
  if (n < 0) n = 0;
  if (n > len - 1) n = Math.max(0, len - 1);
  return n;
}

app.stage = function () { return app.pack.stages[app.stageIndex] || null; };
app.level = function () {
  var st = app.stage();
  if (!st) return null;
  return st.levels[app.levelIndex] || null;
};

// A stage must never be empty, or there is nothing to draw.
(function ensureLevel() {
  var st = app.stage();
  if (st && !st.levels.length) st.levels.push(T.newLevel({ id: 'lvl-1' }));
})();

// ------------------------------------------------------------------- DOM

var canvasEl = document.getElementById('ed-canvas');
var hudEl = document.getElementById('ed-hud');
var toastEl = document.getElementById('ed-toast');
var stripEl = document.getElementById('ed-toolstrip');
var stripText = document.getElementById('ed-toolstrip-text');
var stripDone = document.getElementById('ed-tool-done');
var stripCancel = document.getElementById('ed-tool-cancel');
var panelEl = document.getElementById('ed-panel');
var stageSel = document.getElementById('ed-stage-select');
var levelSel = document.getElementById('ed-level-select');
var confirmEl = document.getElementById('ed-confirm');
var confirmText = document.getElementById('ed-confirm-text');
var confirmOk = document.getElementById('ed-confirm-ok');
var confirmCancel = document.getElementById('ed-confirm-cancel');

var canvasApi = null;
var panel = null;

// ------------------------------------------------------------ undo/redo

var history = [];
var histIndex = -1;

function snapshot() {
  return JSON.stringify({ pack: app.pack, stageIndex: app.stageIndex, levelIndex: app.levelIndex });
}

function pushHistory() {
  var snap = snapshot();
  if (histIndex >= 0 && history[histIndex] === snap) return;
  history = history.slice(0, histIndex + 1);
  history.push(snap);
  if (history.length > HISTORY_CAP) history.shift();
  histIndex = history.length - 1;
  updateTopBar();
}

function restore(snap) {
  var data = JSON.parse(snap);
  app.pack = data.pack;
  app.stageIndex = clampIndex(data.stageIndex, app.pack.stages.length);
  app.levelIndex = clampIndex(data.levelIndex, (app.stage().levels || []).length);
  app.sel = [];
  scheduleSave();
  refreshCrumbs();
  panel.invalidate();
  canvasApi.draw();
  updateTopBar();
}

function undo() {
  if (histIndex <= 0) { toast('Nothing to undo'); return; }
  histIndex--;
  restore(history[histIndex]);
}

function redo() {
  if (histIndex >= history.length - 1) { toast('Nothing to redo'); return; }
  histIndex++;
  restore(history[histIndex]);
}

// ------------------------------------------------------------- autosave

var saveTimer = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, AUTOSAVE_MS);
}

function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  lsSet(LS_PACK, JSON.stringify(app.pack));
  lsSet(LS_CURSOR, JSON.stringify({ stageIndex: app.stageIndex, levelIndex: app.levelIndex }));
}

// ------------------------------------------------------------- app verbs

function commit(labelText) {
  pushHistory();
  scheduleSave();
  canvasApi.draw();
  panel.refresh();
  updateHud();
}

function onLiveEdit() {
  canvasApi.draw();
  updateHud();
}

function refreshPanel() {
  panel.refresh();
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  if (toast._t) clearTimeout(toast._t);
  toast._t = setTimeout(function () { toastEl.hidden = true; }, 2200);
}

function confirmDialog(message, okLabel) {
  confirmText.textContent = message;
  confirmOk.textContent = okLabel || 'Delete';
  confirmEl.hidden = false;
  return new Promise(function (resolve) {
    function done(answer) {
      confirmEl.hidden = true;
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onNo);
      resolve(answer);
    }
    function onOk() { done(true); }
    function onNo() { done(false); }
    confirmOk.addEventListener('click', onOk);
    confirmCancel.addEventListener('click', onNo);
  });
}

function setToolstrip(text, opts) {
  if (!text) {
    stripEl.hidden = true;
    if (canvasApi) canvasApi.notifyChrome();
    return;
  }
  var o = opts || {};
  stripText.textContent = text;
  stripDone.textContent = o.doneLabel || 'Done';
  stripCancel.textContent = o.cancelLabel || 'Cancel';
  stripDone.hidden = o.hideDone === true;
  stripEl.hidden = false;
  if (canvasApi) canvasApi.notifyChrome();
  stripDone.onclick = function () {
    stripEl.hidden = true;
    if (o.onDone) o.onDone();
    else if (canvasApi.hasPolyDraft()) canvasApi.finishPoly();
  };
  stripCancel.onclick = function () {
    stripEl.hidden = true;
    if (o.onCancel) o.onCancel();
    else {
      app.pickMode = null;
      canvasApi.cancelPoly();
    }
  };
}

function setTool(tool) {
  app.tool = tool;
  app.pickMode = null;
  if (canvasApi && canvasApi.hasPolyDraft()) canvasApi.cancelPoly();
  if (isPolyTool(tool)) setToolstrip('Tap points, then Done');
  else if (tool === 'belt') setToolstrip('Drag a stroke', { hideDone: true });
  else setToolstrip(null);
  panel.refresh();
  updateHud();
  canvasEl.style.cursor = tool === 'select' ? 'default' : 'crosshair';
}

function afterPlace() {
  if (!app.stickyTool && !isPolyTool(app.tool) && app.tool !== 'belt') setTool('select');
  panel.setTab('inspect');
  panel.refresh();
}

function setSel(list) {
  app.sel = list || [];
}

function addSel(ref) {
  if (!app.isSelected(ref)) app.sel.push(ref);
}

function isSelected(ref) {
  for (var i = 0; i < app.sel.length; i++) {
    if (app.sel[i].kind === ref.kind && app.sel[i].index === ref.index) return true;
  }
  return false;
}

function deleteSelection() {
  var lv = app.level();
  if (!app.sel.length) return;
  var fixtureIdx = [];
  var solutionIdx = [];
  var blocked = false;
  for (var i = 0; i < app.sel.length; i++) {
    var s = app.sel[i];
    if (s.kind === 'fixture') fixtureIdx.push(s.index);
    else if (s.kind === 'solution') solutionIdx.push(s.index);
    else blocked = true;
  }
  if (blocked && !fixtureIdx.length && !solutionIdx.length) {
    toast('The ship and the target cannot be deleted');
    return;
  }
  fixtureIdx.sort(function (a, b) { return b - a; });
  for (i = 0; i < fixtureIdx.length; i++) lv.fixtures.splice(fixtureIdx[i], 1);
  solutionIdx.sort(function (a, b) { return b - a; });
  for (i = 0; i < solutionIdx.length; i++) lv.solution.splice(solutionIdx[i], 1);
  app.sel = [];
  commit('Delete');
}

function duplicateSelection() {
  var lv = app.level();
  var made = [];
  for (var i = 0; i < app.sel.length; i++) {
    var s = app.sel[i];
    if (s.kind !== 'fixture') continue;
    var f = lv.fixtures[s.index];
    if (!f) continue;
    var copy = T.cloneJSON(f);
    copy.id = T.uniqueFixtureId(lv, String(f.type));
    shift(copy, 30, 30);
    lv.fixtures.push(copy);
    made.push({ kind: 'fixture', index: lv.fixtures.length - 1 });
  }
  if (!made.length) { toast('Nothing to duplicate'); return; }
  app.sel = made;
  commit('Duplicate');
}

function shift(f, dx, dy) {
  var i;
  if (f.type === 'wormhole') {
    f.a.x += dx; f.a.y += dy; f.b.x += dx; f.b.y += dy;
    return;
  }
  if (f.shape === 'poly') {
    for (i = 0; i < (f.points || []).length; i++) { f.points[i].x += dx; f.points[i].y += dy; }
    return;
  }
  if (f.path) {
    for (i = 0; i < f.path.length; i++) { f.path[i].x += dx; f.path[i].y += dy; }
  }
  if (f.x != null) { f.x += dx; f.y += dy; }
}

function nudge(dx, dy) {
  if (!app.sel.length) return;
  var lv = app.level();
  for (var i = 0; i < app.sel.length; i++) {
    var s = app.sel[i];
    if (s.kind === 'ship') { lv.ship.x += dx; lv.ship.y += dy; }
    else if (s.kind === 'target') { lv.target.x += dx; lv.target.y += dy; }
    else if (s.kind === 'solution' && lv.solution[s.index]) { lv.solution[s.index].x += dx; lv.solution[s.index].y += dy; }
    else if (s.kind === 'fixture' && lv.fixtures[s.index]) shift(lv.fixtures[s.index], dx, dy);
  }
  commit('Nudge');
}

function displayWells() {
  var lv = app.level();
  return (lv && lv.solution) || [];
}

function pickPosition(message, cb) {
  app.pickMode = cb;
  setToolstrip(message, {
    hideDone: true,
    onCancel: function () { app.pickMode = null; }
  });
  collapsePanel();
}

// ------------------------------------------------------- stage / level nav

function setStage(index) {
  app.stageIndex = clampIndex(index, app.pack.stages.length);
  var st = app.stage();
  if (st && !st.levels.length) st.levels.push(T.newLevel({ id: T.uniqueId('lvl-1', T.levelIds(app.pack)) }));
  app.levelIndex = 0;
  app.sel = [];
  clearOverlay();
  refreshCrumbs();
  panel.invalidate();
  canvasApi.fit();
  scheduleSave();
}

function setLevel(index) {
  var st = app.stage();
  app.levelIndex = clampIndex(index, st.levels.length);
  app.sel = [];
  clearOverlay();
  refreshCrumbs();
  panel.invalidate();
  canvasApi.fit();
  scheduleSave();
}

function refreshCrumbs() {
  var i;
  while (stageSel.firstChild) stageSel.removeChild(stageSel.firstChild);
  for (i = 0; i < app.pack.stages.length; i++) {
    var o = document.createElement('option');
    o.value = String(i);
    o.textContent = app.pack.stages[i].title || ('Stage ' + (i + 1));
    stageSel.appendChild(o);
  }
  stageSel.value = String(app.stageIndex);

  while (levelSel.firstChild) levelSel.removeChild(levelSel.firstChild);
  var levels = (app.stage() && app.stage().levels) || [];
  for (i = 0; i < levels.length; i++) {
    var l = document.createElement('option');
    l.value = String(i);
    l.textContent = (levels[i].optional ? '★ ' : '') + (levels[i].name || levels[i].id);
    levelSel.appendChild(l);
  }
  levelSel.value = String(app.levelIndex);
  updateHud();
}

function updateTopBar() {
  document.getElementById('ed-undo').disabled = histIndex <= 0;
  document.getElementById('ed-redo').disabled = histIndex >= history.length - 1;
}

function updateHud() {
  var lv = app.level();
  if (!lv) return;
  var fixtures = (lv.fixtures || []).length;
  var chg = (lv.solution || []).reduce(function (a, w) { return a + w.charges; }, 0);
  hudEl.textContent = lv.id + '  ' + lv.bounds.w + '×' + lv.bounds.h +
    '  ·  ' + fixtures + ' fixture' + (fixtures === 1 ? '' : 's') +
    '  ·  solution ' + chg + '/' + lv.charges + ' chg' +
    '  ·  tool: ' + app.tool;
}

// --------------------------------------------------------------- overlays

function clearOverlay() {
  app.overlay.hotzone = null;
  app.overlay.wells = null;
  app.overlay.path = null;
  app.overlay.pathEnd = null;
  app.overlay.tolerance = null;
  if (canvasApi) canvasApi.draw();
}

function showFamily(fam) {
  app.overlay.wells = fam.wells;
  predictOverlay(fam.wells);
  toast(fam.totalCharges + ' charges in ' + fam.wells.length + ' well(s)');
}

function predictOverlay(wells) {
  import('../sim.js').then(function (Sim) {
    var lv = app.level();
    var res = Sim.predict(lv, wells, Sim.MAX_FLIGHT_SECONDS);
    app.overlay.path = res.ship;
    app.overlay.pathEnd = res.outcome === 'win' ? 'ring' : res.outcome ? 'x' : null;
    canvasApi.draw();
  }).catch(function () { /* prediction is a nicety */ });
}

function useAsSolution(wells) {
  var lv = app.level();
  lv.solution = T.cloneJSON(wells);
  app.overlay.wells = null;
  commit('Use as solution');
  toast('Solution set (' + wells.length + ' well(s))');
}

// ------------------------------------------------------- analysis worker

var worker = null;
var jobSeq = 0;
var activeJob = 0;

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./analyse.worker.js', import.meta.url), { type: 'module' });
  worker.addEventListener('message', onWorkerMessage);
  worker.addEventListener('error', function (e) {
    panel.setAnalyseOutput('<span class="ed-bad">Analysis worker failed: ' +
      escapeHTML(e.message || 'unknown error') + '</span>');
  });
  return worker;
}

function analyse(cmd) {
  var lv = app.level();
  var w = ensureWorker();
  jobSeq++;
  activeJob = jobSeq;
  panel.setProgress(0, 'starting');
  panel.setAnalyseOutput('<span class="ed-note">Running ' + cmd + '…</span>');
  var s = app.analyseSettings;
  w.postMessage({
    id: activeJob,
    cmd: cmd,
    level: T.canonicalLevel(lv),
    opts: {
      charges: Math.max(1, Math.round(s.charges)),
      step: Math.max(8, Math.round(s.step)),
      samples: Math.max(50, Math.round(s.samples)),
      floor: s.floor,
      wells: lv.solution || []
    }
  });
}

function cancelAnalyse() {
  if (!worker) return;
  worker.postMessage({ cmd: 'cancel' });
  activeJob = 0;
  panel.setProgress(0, '');
  panel.setAnalyseOutput('<span class="ed-note">Cancelled.</span>');
}

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function onWorkerMessage(e) {
  var msg = e.data || {};
  if (msg.id !== activeJob) return;
  if (msg.type === 'progress') {
    panel.setProgress(msg.value, msg.phase + ' ' + msg.note);
    return;
  }
  if (msg.type === 'cancelled') {
    panel.setProgress(0, '');
    return;
  }
  if (msg.type === 'error') {
    panel.setAnalyseOutput('<span class="ed-bad">' + escapeHTML(msg.message) + '</span>');
    return;
  }
  if (msg.type !== 'result') return;
  panel.setProgress(1, 'done');

  if (msg.cmd === 'hotzone') {
    app.overlay.hotzone = { cols: msg.cols, rows: msg.rows, step: msg.step, cells: msg.cells };
    canvasApi.draw();
    panel.setAnalyseOutput(
      '<b>Hot zone</b> — ' + msg.charges + ' charge(s), step ' + msg.step + '<br>' +
      'winning area ' + Math.round(msg.winArea) + ' u² in <b>' + msg.regions + '</b> region(s), ' +
      msg.winCells + ' of ' + (msg.cols * msg.rows) + ' cells.' +
      (msg.winCells === 0 ? '<br><span class="ed-good">No single well of this size solves it.</span>' : '')
    );
    return;
  }
  if (msg.cmd === 'solve') {
    var html = '<b>Solution finder</b> — ' + msg.winners + ' winners in ' + msg.tried +
      ' legal samples (of ' + msg.samples + ' tried), ' + msg.families.length + ' famil' +
      (msg.families.length === 1 ? 'y' : 'ies') + '.';
    if (!msg.families.length) html += '<br><span class="ed-warn">Nothing found — raise the sample count or check the budget.</span>';
    panel.setAnalyseOutput(html, msg.families);
    return;
  }
  if (msg.cmd === 'tolerance') {
    var discs = [];
    var lines = '';
    for (var i = 0; i < msg.wells.length; i++) {
      var w = msg.wells[i];
      var ok = w.r >= msg.floor;
      discs.push({ x: w.x, y: w.y, r: w.r, ok: ok });
      lines += '<br>well ' + (i + 1) + ': <b>' + Math.round(w.r) + '</b>' +
        (ok ? ' <span class="ed-good">ok</span>' : ' <span class="ed-warn">below floor ' + msg.floor + '</span>');
    }
    app.overlay.tolerance = discs;
    canvasApi.draw();
    panel.setAnalyseOutput('<b>Tolerance</b> (floor ' + msg.floor + ')' + lines);
    return;
  }
  if (msg.cmd === 'lint') {
    var out = '<b>Lint</b> — physics ' + escapeHTML(msg.physicsVersion) + '<br>';
    for (var k = 0; k < msg.notes.length; k++) {
      var n = msg.notes[k];
      var cls = n.level === 'error' ? 'ed-bad' : n.level === 'warn' ? 'ed-warn' : n.level === 'ok' ? 'ed-good' : 'ed-note';
      var mark = n.level === 'error' ? '✕' : n.level === 'warn' ? '!' : n.level === 'ok' ? '✓' : '·';
      out += '<span class="' + cls + '">' + mark + ' ' + escapeHTML(n.text) + '</span><br>';
    }
    panel.setAnalyseOutput(out);
  }
}

// ------------------------------------------------------ export / import

function download(filename, text) {
  var blob = new Blob([text], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function copyText(text) {
  var done = function () { toast('Copied to clipboard'); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
      return;
    }
  } catch (e) { /* fall through */ }
  fallback();

  function fallback() {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e2) {
      toast('Copy failed — the JSON is in the box below');
    }
  }
}

function exportJSON(what) {
  var text;
  var name;
  if (what === 'level') {
    var lv = app.level();
    text = T.exportLevelText(lv);
    name = (lv.id || 'level') + '.json';
  } else {
    var check = T.validatePack(app.pack);
    if (!check.ok) toast('Exported, but the pack has ' + check.errors.length + ' problem(s)');
    text = T.exportPackText(app.pack);
    name = (app.pack.id || 'pack') + '.json';
  }
  var box = document.getElementById('pk-export-out');
  if (box) box.value = text;
  copyText(text);
  download(name, text);
  return text;
}

function importJSON(text) {
  var res = T.parseImport(text);
  if (!res.ok) {
    toast('Import failed');
    var box = document.getElementById('pk-export-out');
    if (box) box.value = res.error;
    return false;
  }
  if (res.kind === 'pack') {
    app.pack = res.pack;
    app.stageIndex = 0;
    app.levelIndex = 0;
    app.sel = [];
    clearOverlay();
    refreshCrumbs();
    panel.invalidate();
    canvasApi.fit();
    commit('Import pack');
    toast('Pack imported (' + app.pack.stages.length + ' stage(s)) — undo restores your old pack');
    return true;
  }
  var stage = app.stage();
  var lvl = res.level;
  lvl.id = T.uniqueId(lvl.id || 'level', T.levelIds(app.pack));
  stage.levels.push(lvl);
  app.levelIndex = stage.levels.length - 1;
  app.sel = [];
  refreshCrumbs();
  panel.invalidate();
  canvasApi.fit();
  commit('Import level');
  toast('Level added to ' + stage.title);
  return true;
}

function playPack() {
  var check = T.validatePack(app.pack);
  if (!check.ok) {
    toast('Fix ' + check.errors.length + ' problem(s) first — see Export');
    var box = document.getElementById('pk-export-out');
    if (box) box.value = check.errors.join('\n');
    return;
  }
  var list = lsJSON(LS_PACKS);
  if (Object.prototype.toString.call(list) !== '[object Array]') list = [];
  var canonical = T.canonicalPack(app.pack);
  var replaced = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === canonical.id) { list[i] = canonical; replaced = true; }
  }
  if (!replaced) list.push(canonical);
  lsSet(LS_PACKS, JSON.stringify(list));
  saveNow();
  window.location.href = 'index.html';
}

// ------------------------------------------------------------ Test flight

function runTest() {
  var lv = app.level();
  var errs = T.validateLevel(lv, 'level');
  if (errs.length) {
    toast('Fix the level first: ' + errs[0]);
    return;
  }
  lsSet(LS_TEST_LEVEL, JSON.stringify(T.canonicalLevel(lv)));
  lsSet(LS_TEST_WELLS, JSON.stringify(lv.solution || []));
  saveNow();
  window.location.href = 'index.html?test=1';
}

// On return from a test flight: ghost the trail, and offer the wells the
// player ended up with as the authored solution.
function pickUpTestResults() {
  // main.js writes {levelId, outcome, reason, t, points:[{x,y,brk}]}; a bare
  // array of points is accepted too so an older trail still ghosts.
  var trail = lsJSON(LS_TRAIL);
  var points = null;
  var outcome = '';
  if (Object.prototype.toString.call(trail) === '[object Array]') points = trail;
  else if (trail && trail.points) {
    points = trail.points;
    outcome = trail.outcome ? ' — ' + trail.outcome + (trail.reason ? ' (' + trail.reason + ')' : '') : '';
  }
  if (points && points.length) {
    app.ghost = points;
    toast('Ghost trail from the last test flight' + outcome);
  }
  var wells = lsJSON(LS_TEST_WELLS);
  var lv = app.level();
  if (!wells || !wells.length) return;
  if (JSON.stringify(wells) === JSON.stringify(lv.solution || [])) return;
  setToolstrip('Wells from the last test: use them as this level’s solution?', {
    doneLabel: 'Use as solution',
    cancelLabel: 'Dismiss',
    onDone: function () { useAsSolution(wells); },
    onCancel: function () { }
  });
}

// -------------------------------------------------------------- panel UX

function collapsePanel() {
  if (window.innerWidth < 860) panelEl.classList.add('collapsed');
}
function expandPanel() {
  panelEl.classList.remove('collapsed');
}

// ---------------------------------------------------------------- wiring

app.commit = commit;
app.onLiveEdit = onLiveEdit;
app.refreshPanel = refreshPanel;
app.refreshCrumbs = refreshCrumbs;
app.toast = toast;
app.confirm = confirmDialog;
app.setTool = setTool;
app.afterPlace = afterPlace;
app.setSel = setSel;
app.addSel = addSel;
app.isSelected = isSelected;
app.deleteSelection = deleteSelection;
app.duplicateSelection = duplicateSelection;
app.displayWells = displayWells;
app.setToolstrip = setToolstrip;
app.pickPosition = pickPosition;
app.setStage = setStage;
app.setLevel = setLevel;
app.fitView = function () { if (canvasApi) canvasApi.fit(); };
app.analyse = analyse;
app.cancelAnalyse = cancelAnalyse;
app.clearOverlay = clearOverlay;
app.showFamily = showFamily;
app.useAsSolution = useAsSolution;
app.exportJSON = exportJSON;
app.importJSON = importJSON;
app.playPack = playPack;
app.expandPanel = expandPanel;

canvasApi = createEditorCanvas(app, canvasEl);
panel = createPanel(app);

refreshCrumbs();
pushHistory();
updateTopBar();
updateHud();
canvasApi.fit();
pickUpTestResults();

stageSel.addEventListener('change', function () { setStage(parseInt(stageSel.value, 10) || 0); });
levelSel.addEventListener('change', function () { setLevel(parseInt(levelSel.value, 10) || 0); });
document.getElementById('ed-undo').addEventListener('click', undo);
document.getElementById('ed-redo').addEventListener('click', redo);
document.getElementById('ed-test').addEventListener('click', runTest);
document.getElementById('ed-zoom-in').addEventListener('click', function () { canvasApi.zoomBy(1.25); });
document.getElementById('ed-zoom-out').addEventListener('click', function () { canvasApi.zoomBy(0.8); });
document.getElementById('ed-zoom-fit').addEventListener('click', function () { canvasApi.fit(); });
document.getElementById('ed-grip').addEventListener('click', function () {
  panelEl.classList.toggle('collapsed');
});

window.addEventListener('beforeunload', saveNow);

// ------------------------------------------------------------- keyboard

function typing(el) {
  if (!el) return false;
  var tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

window.addEventListener('keydown', function (e) {
  if (typing(document.activeElement)) return;
  var meta = e.ctrlKey || e.metaKey;
  if (meta && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if (meta && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
  if (meta && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateSelection(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
  if (e.key === 'Escape') {
    if (canvasApi.hasPolyDraft()) { canvasApi.cancelPoly(); return; }
    if (app.pickMode) { app.pickMode = null; setToolstrip(null); return; }
    if (app.tool !== 'select') { setTool('select'); return; }
    app.sel = [];
    panel.refresh();
    canvasApi.draw();
    return;
  }
  var d = e.shiftKey ? 10 : 1;
  if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-d, 0); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(d, 0); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -d); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, d); }
});

// ------------------------------------------------------------- test hook

// The smoke test drives the real UI; this is only for reading state back out.
window.GWED = {
  app: app,
  view: canvasApi.view,
  worldToScreen: canvasApi.worldToScreen,
  draw: canvasApi.draw,
  fit: canvasApi.fit,
  level: function () { return app.level(); },
  pack: function () { return app.pack; },
  exportPackText: function () { return T.exportPackText(app.pack); },
  exportLevelText: function () { return T.exportLevelText(app.level()); },
  validatePack: function () { return T.validatePack(app.pack); },
  importJSON: importJSON,
  setTool: setTool,
  undo: undo,
  redo: redo,
  ready: true
};
