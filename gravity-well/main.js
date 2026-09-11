// Gravity Well — main.js
// App state machine (menu / plan / flight / result), level loading, the wells
// model + budget rules, prediction scheduling, the flight loop and all DOM glue.

import {
  PHYSICS_VERSION, DT, SHIP_RADIUS,
  killRadius, createState, step, predict, fieldAt, validateWells
} from './sim.js';
import * as levelsModule from './levels.js';
import { createInput } from './input.js';
import * as R from './render.js';

// levels.js is authored in a later stage; read it through the namespace so a
// missing optional export (WORLDS) is a fallback rather than a load failure.
var LEVELS = levelsModule.LEVELS || [];
var WORLDS = levelsModule.WORLDS || null;

// ------------------------------------------------------------------ storage

var PROGRESS_KEY = 'gw.progress';

function loadProgress() {
  var empty = { completed: {}, radioSeen: {}, lastLevel: null };
  try {
    var raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return empty;
    var p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return empty;
    return {
      completed: p.completed || {},
      radioSeen: p.radioSeen || {},
      lastLevel: p.lastLevel == null ? null : p.lastLevel
    };
  } catch (e) { return empty; }
}

function saveProgress() {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { /* private mode */ }
}

var progress = loadProgress();

// ---------------------------------------------------------------- DOM refs

function $(id) { return document.getElementById(id); }

var el = {
  viewMenu: $('view-menu'),
  viewPlay: $('view-play'),
  menuList: $('menu-list'),
  resetProgress: $('btn-reset-progress'),
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
  clock: 0,              // animation clock (seconds) for pulses/spins
  lastFrame: 0,
  rafId: 0
};

var ARROW_SPACING = 60;   // world units
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
  app.view = R.computeView(app.cssW, app.cssH, app.level.bounds, {
    top: top + 10, bottom: bottom + 10, left: 10, right: 10
  });
}

// ------------------------------------------------------------------- menu

function worldTitle(phase) {
  if (WORLDS) {
    for (var i = 0; i < WORLDS.length; i++) {
      if (WORLDS[i] && WORLDS[i].phase === phase) {
        return 'World ' + phase + ' — ' + WORLDS[i].title;
      }
    }
  }
  return 'World ' + phase;
}

function isOptional(lv) { return !!(lv && lv.optional); }

// A required level unlocks when the previous REQUIRED level is complete (or it
// is the first one). An optional level unlocks when every required level in its
// own world is complete.
function isUnlocked(index) {
  var lv = LEVELS[index];
  if (!lv) return false;
  if (isOptional(lv)) {
    for (var j = 0; j < LEVELS.length; j++) {
      var o = LEVELS[j];
      if (o.phase !== lv.phase || isOptional(o)) continue;
      if (!progress.completed[o.id]) return false;
    }
    return true;
  }
  for (var k = index - 1; k >= 0; k--) {
    if (isOptional(LEVELS[k])) continue;
    return !!progress.completed[LEVELS[k].id];
  }
  return true; // first required level
}

// Index of the next REQUIRED level after `index`, or -1.
function nextRequiredIndex(index) {
  for (var i = index + 1; i < LEVELS.length; i++) {
    if (!isOptional(LEVELS[i])) return i;
  }
  return -1;
}

function buildMenu() {
  el.menuList.innerHTML = '';
  if (!LEVELS || !LEVELS.length) {
    var empty = document.createElement('p');
    empty.className = 'menu-empty';
    empty.textContent = 'No levels found.';
    el.menuList.appendChild(empty);
    return;
  }
  var lastPhase = null;
  var nInWorld = 0;
  for (var i = 0; i < LEVELS.length; i++) {
    var lv = LEVELS[i];
    if (lv.phase !== lastPhase) {
      lastPhase = lv.phase;
      nInWorld = 0;
      var h = document.createElement('div');
      h.className = 'phase-head';
      h.textContent = worldTitle(lv.phase);
      el.menuList.appendChild(h);
    }
    nInWorld++;
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
    idx.textContent = optional ? '\u2605' : String(nInWorld);

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

// -------------------------------------------------------------- level load

function openLevel(index) {
  var lv = LEVELS[index];
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
  fireRadio('start');
}

// ------------------------------------------------------------------- radio

var radioTimer = 0;

function radioKey(levelId, when, index) { return levelId + ':' + when + ':' + index; }

function fireRadio(when) {
  var lv = app.level;
  if (!lv || !lv.radio) return;
  for (var i = 0; i < lv.radio.length; i++) {
    var m = lv.radio[i];
    if (m.when !== when) continue;
    var key = radioKey(lv.id, when, i);
    if (m.once && progress.radioSeen[key]) continue;
    if (m.once) { progress.radioSeen[key] = true; saveProgress(); }
    showRadio(m.text);
    return;
  }
}

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
  // Tutorial: once a well exists, draw attention to Launch.
  if (app.level.hint && app.mode === 'plan' && app.wells.length > 0) {
    el.btnLaunch.classList.add('btn-attention');
  } else {
    el.btnLaunch.classList.remove('btn-attention');
  }
}

function handleTap(wx, wy, index) {
  if (app.mode !== 'plan') return;
  var lv = app.level;
  var used = totalCharges(app.wells);
  if (index >= 0) {
    var w = app.wells[index];
    if (w.charges >= lv.stackLimit) { toast('Max stack'); return; }
    if (used >= lv.charges) { toast('No charges left'); return; }
    w.charges += 1;
  } else {
    if (used >= lv.charges) { toast('No charges left'); return; }
    var p = clampToBounds({ x: wx, y: wy }, lv.bounds);
    app.wells.push({ x: p.x, y: p.y, charges: 1 });
    if (app.wells.length === 1) fireRadio('firstWell');
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

function handleDragStart(index) { app.dragIndex = index; }

function handleDragMove(index, wx, wy) {
  if (app.mode !== 'plan') return;
  var w = app.wells[index];
  if (!w) return;
  var p = clampToBounds({ x: wx, y: wy }, app.level.bounds);
  w.x = p.x; w.y = p.y;
  markWellsChanged();
}

function handleDragEnd() { app.dragIndex = -1; }

// ------------------------------------------------------- prediction / field

function recomputeArrows() {
  var lv = app.level;
  if (!lv) return;
  var out = [];
  var wells = app.wells;
  for (var y = ARROW_SPACING / 2; y < lv.bounds.h; y += ARROW_SPACING) {
    for (var x = ARROW_SPACING / 2; x < lv.bounds.w; x += ARROW_SPACING) {
      var skip = false;
      for (var i = 0; i < wells.length; i++) {
        var dx = x - wells[i].x, dy = y - wells[i].y;
        var kr = killRadius(wells[i].charges) + 6;
        if (dx * dx + dy * dy <= kr * kr) { skip = true; break; }
      }
      if (skip) continue;
      var f = fieldAt(wells, x, y);
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
  app.outcomeAt = -1;
  app.mode = 'flight';
  el.planControls.hidden = true;
  el.flightControls.hidden = false;
  el.closest.hidden = true;
  el.btnLaunch.classList.remove('btn-attention');
  hideRadio();
  fireRadio('launch');
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

function recordTrails(s) {
  var tr = app.trails;
  if (s.ship && s.ship.alive !== false) {
    tr.ship.push({ x: s.ship.x, y: s.ship.y });
    if (tr.ship.length > TRAIL_MAX) tr.ship.shift();
  }
  for (var i = 0; i < s.bodies.length; i++) {
    var b = s.bodies[i];
    if (b.alive === false) continue;
    if (b.type === 'obstacle' || b.type === 'oreReceiver') continue;
    var list = tr.byId[b.id];
    if (!list) { list = tr.byId[b.id] = []; }
    list.push({ x: b.x, y: b.y });
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

  el.btnNext.hidden = !win || nextRequiredIndex(app.levelIndex) < 0;

  if (win) {
    progress.completed[app.level.id] = true;
    saveProgress();
  }
  el.result.hidden = false;
  fireRadio(win ? 'win' : 'fail');
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
  if (parts[0] !== PHYSICS_VERSION) { toast('Wrong physics version'); return; }
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

  R.drawBodies(ctx, view, s.bodies, app.clock, s.ship);
  R.drawTarget(ctx, view, lv.target, app.clock);

  if (!flying) {
    drawPlanPreview(view, lv);
  } else {
    drawFlightTrails(view);
  }

  R.drawWells(ctx, view, app.wells, killRadius, { selected: app.dragIndex });

  if (s.ship && s.ship.alive !== false) {
    R.drawShip(ctx, view, s.ship, SHIP_RADIUS, { showVelocity: !flying });
  }

  if (!flying && lv.hint && lv.hint.well && app.wells.length === 0) {
    R.drawHint(ctx, view, lv.hint.well, app.clock);
  }
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
  if (!window.confirm('Erase all progress?')) return;
  progress = { completed: {}, radioSeen: {}, lastLevel: null };
  saveProgress();
  buildMenu();
});

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

document.addEventListener('visibilitychange', function () {
  if (document.hidden) stopLoop();
  else startLoop();
});

// Expose a tiny surface for the smoke test / debugging. Read-only in spirit.
window.GW = {
  get mode() { return app.mode; },
  get wells() { return app.wells; },
  get level() { return app.level; },
  get view() { return app.view; },
  openLevel: openLevel
};

showMenu();
resize();
startLoop();
