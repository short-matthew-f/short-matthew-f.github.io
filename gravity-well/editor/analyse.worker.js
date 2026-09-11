// Gravity Well — editor/analyse.worker.js
//
// The editor's analysis engine, off the UI thread. Started as a module worker:
//
//   new Worker(new URL('./analyse.worker.js', import.meta.url), { type: 'module' })
//
// so it can import the real sim and the real hot-zone library rather than a
// copy — the numbers the editor shows are the numbers `node tools/hotzone.js`
// and the level tests produce.
//
// Protocol
// --------
// in:  { id, cmd:'hotzone'|'solve'|'tolerance'|'lint'|'cancel', level, opts }
// out: { id, type:'progress', phase, value:0..1, note }
//      { id, type:'result', ... }         (shape depends on cmd)
//      { id, type:'error', message }
//      { id, type:'cancelled' }
//
// Every long loop yields to the message queue every few rows (a worker is
// single-threaded, so a 'cancel' message can only be seen while we are not
// running), and checks the cancel flag on the way back in. Stale jobs are
// dropped by id, so a result from an abandoned run can never paint.

import { run, validateWells, killRadius, SHIP_RADIUS, PHYSICS_VERSION } from '../sim.js';
import {
  classifyPoint, countRegions, toleranceRadius, randomWinRate,
  CELL_FAIL, CELL_WIN, CELL_OBSTACLE, CELL_SHIP, CELL_TARGET, floorFor
} from '../tools/hotzone.js';
import { mulberry32, hashSeed } from './tools.js';

var MAX_SECONDS = 40;     // a flight that has not resolved by here is a fail
var jobId = 0;            // the job we are currently allowed to report on
var cancelled = false;

function yieldToQueue() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

function post(id, msg) {
  msg.id = id;
  self.postMessage(msg);
}

function progress(id, phase, value, note) {
  post(id, { type: 'progress', phase: phase, value: value, note: note || '' });
}

function wins(level, wells) {
  var v = validateWells(level, wells);
  if (!v.ok) return false;
  var res = run(level, wells, { maxSeconds: MAX_SECONDS });
  return res.outcome === 'win';
}

// sim.js owns every placement rule now (budget, stack limit, bounds, dead and
// allowed zones, spacing from other wells / fixed wells / repulsors), so the
// analyser asks it rather than keeping a second copy that could drift.
function legalWell(level, w) {
  return validateWells(level, [w]).ok;
}

// ---------------------------------------------------------------------------
// Hot zone: single-well sweep, row by row so progress and cancel both work
// ---------------------------------------------------------------------------

async function hotzone(id, level, opts) {
  var charges = opts.charges || 1;
  var step = opts.step || 24;
  var cols = Math.max(1, Math.floor(level.bounds.w / step));
  var rows = Math.max(1, Math.floor(level.bounds.h / step));
  var cells = new Uint8Array(cols * rows);
  var winCells = 0;

  for (var r = 0; r < rows; r++) {
    var y = (r + 0.5) * step;
    for (var c = 0; c < cols; c++) {
      var x = (c + 0.5) * step;
      var kind = classifyPoint(level, x, y, charges);
      var v;
      if (kind === 'obstacle') v = CELL_OBSTACLE;
      else if (kind === 'ship') v = CELL_SHIP;
      else if (kind === 'target') v = CELL_TARGET;
      else if (!legalWell(level, { x: x, y: y, charges: charges })) v = CELL_OBSTACLE;
      else v = wins(level, [{ x: x, y: y, charges: charges }]) ? CELL_WIN : CELL_FAIL;
      if (v === CELL_WIN) winCells++;
      cells[r * cols + c] = v;
    }
    progress(id, 'hotzone', (r + 1) / rows, 'row ' + (r + 1) + '/' + rows);
    await yieldToQueue();
    if (cancelled || id !== jobId) return null;
  }

  return {
    charges: charges,
    step: step,
    cols: cols,
    rows: rows,
    cells: cells,
    winCells: winCells,
    winArea: winCells * step * step,
    regions: countRegions(cells, cols, rows)
  };
}

/** The cheapest charge count that any single well can solve the level with. */
async function minSingleWellCharges(id, level, step) {
  var stackLimit = level.stackLimit != null ? level.stackLimit : level.charges;
  var budget = level.charges != null ? level.charges : 0;
  var top = Math.min(stackLimit, budget);
  for (var n = 1; n <= top; n++) {
    progress(id, 'single', (n - 1) / Math.max(1, top), 'single well, ' + n + ' charge(s)');
    var sweep = await hotzone(id, level, { charges: n, step: step });
    if (!sweep) return null;
    if (sweep.winCells > 0) {
      return { charges: n, winCells: sweep.winCells, winArea: sweep.winArea, regions: sweep.regions };
    }
  }
  return { charges: 0, winCells: 0, winArea: 0, regions: 0 };
}

// ---------------------------------------------------------------------------
// Solution finder: random search, local refinement, clustering into families
// ---------------------------------------------------------------------------

function splitCharges(rng, budget, count, stackLimit) {
  var left = budget;
  var out = [];
  for (var i = 0; i < count; i++) {
    var remaining = count - i - 1;
    var max = Math.min(stackLimit, left - remaining);
    if (max < 1) return null;
    var n = 1 + Math.floor(rng() * max);
    out.push(n);
    left -= n;
  }
  return out;
}

function sameFamily(a, b, radius) {
  if (a.length !== b.length) return false;
  var used = {};
  for (var i = 0; i < a.length; i++) {
    var best = -1;
    var bestD = radius;
    for (var j = 0; j < b.length; j++) {
      if (used[j]) continue;
      var d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
      if (d < bestD && a[i].charges === b[j].charges) { bestD = d; best = j; }
    }
    if (best < 0) return false;
    used[best] = 1;
  }
  return true;
}

async function solve(id, level, opts) {
  var samples = opts.samples || 3000;
  var radius = opts.clusterRadius || 120;
  var rng = mulberry32(hashSeed(level.id || 'level') ^ 0x9e3779b9);
  var budget = level.charges != null ? level.charges : 1;
  var stackLimit = level.stackLimit != null ? level.stackLimit : budget;
  var maxWells = Math.max(1, Math.min(budget, opts.maxWells || budget));
  var winners = [];
  var tried = 0;

  for (var i = 0; i < samples; i++) {
    var count = 1 + Math.floor(rng() * maxWells);
    var split = splitCharges(rng, budget, count, stackLimit);
    if (split) {
      var wells = [];
      var ok = true;
      for (var j = 0; j < split.length; j++) {
        var w = { x: rng() * level.bounds.w, y: rng() * level.bounds.h, charges: split[j] };
        if (!legalWell(level, w)) { ok = false; break; }
        wells.push(w);
      }
      if (ok) {
        tried++;
        if (wins(level, wells)) winners.push(wells);
      }
    }
    if ((i & 31) === 31) {
      progress(id, 'solve', (i + 1) / samples, winners.length + ' winners in ' + tried + ' tries');
      await yieldToQueue();
      if (cancelled || id !== jobId) return null;
    }
  }

  // Local refinement: nudge each winner onto a spot that still wins with the
  // biggest slack, so the family representative is a comfortable placement and
  // not something perched on the edge of its region.
  var refined = [];
  for (var k = 0; k < winners.length; k++) {
    var base = winners[k];
    var best = base;
    var bestScore = -1;
    for (var attempt = 0; attempt < 6; attempt++) {
      var cand = [];
      for (var m = 0; m < base.length; m++) {
        cand.push({
          x: base[m].x + (attempt === 0 ? 0 : (rng() * 2 - 1) * 40),
          y: base[m].y + (attempt === 0 ? 0 : (rng() * 2 - 1) * 40),
          charges: base[m].charges
        });
      }
      var legal = true;
      for (var n2 = 0; n2 < cand.length; n2++) if (!legalWell(level, cand[n2])) legal = false;
      if (!legal || !wins(level, cand)) continue;
      var score = slack(level, cand);
      if (score > bestScore) { bestScore = score; best = cand; }
    }
    refined.push({ wells: best, score: bestScore });
    if ((k & 7) === 7) {
      progress(id, 'refine', (k + 1) / winners.length, 'refining ' + (k + 1) + '/' + winners.length);
      await yieldToQueue();
      if (cancelled || id !== jobId) return null;
    }
  }

  // Greedy clustering into families.
  var families = [];
  for (var f = 0; f < refined.length; f++) {
    var placed = false;
    for (var g = 0; g < families.length; g++) {
      if (sameFamily(refined[f].wells, families[g].wells, radius)) {
        families[g].count++;
        if (refined[f].score > families[g].score) {
          families[g].wells = refined[f].wells;
          families[g].score = refined[f].score;
        }
        placed = true;
        break;
      }
    }
    if (!placed) {
      families.push({ wells: refined[f].wells, count: 1, score: refined[f].score });
    }
  }

  for (var q = 0; q < families.length; q++) {
    var tot = 0;
    for (var z = 0; z < families[q].wells.length; z++) tot += families[q].wells[z].charges;
    families[q].totalCharges = tot;
    families[q].wells = families[q].wells.map(function (w) {
      return { x: Math.round(w.x), y: Math.round(w.y), charges: w.charges };
    });
  }
  families.sort(function (a, b) {
    if (a.totalCharges !== b.totalCharges) return a.totalCharges - b.totalCharges;
    return b.count - a.count;
  });

  return { samples: samples, tried: tried, winners: winners.length, families: families.slice(0, 12) };
}

/** Cheap proxy for tolerance: how far the first well can move and still win. */
function slack(level, wells) {
  var d = 0;
  for (var step = 20; step <= 100; step += 20) {
    var probe = wells.slice();
    probe[0] = { x: wells[0].x + step, y: wells[0].y, charges: wells[0].charges };
    if (!legalWell(level, probe[0]) || !wins(level, probe)) break;
    d = step;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Tolerance + lint
// ---------------------------------------------------------------------------

async function tolerance(id, level, opts) {
  var wells = opts.wells || level.solution || [];
  var out = [];
  for (var i = 0; i < wells.length; i++) {
    progress(id, 'tolerance', i / Math.max(1, wells.length), 'well ' + (i + 1) + '/' + wells.length);
    await yieldToQueue();
    if (cancelled || id !== jobId) return null;
    out.push({
      x: wells[i].x,
      y: wells[i].y,
      charges: wells[i].charges,
      r: toleranceRadius(level, wells, i, { step: opts.step || 10, window: opts.window || 150 })
    });
  }
  progress(id, 'tolerance', 1, 'done');
  return { wells: out, floor: opts.floor != null ? opts.floor : floorFor(level) };
}

async function lint(id, level, opts) {
  var notes = [];
  var floor = opts.floor != null ? opts.floor : 40;
  var step = opts.step || 48;
  var i, f;

  function add(level_, text) { notes.push({ level: level_, text: text }); }

  if (!level.ship) add('error', 'No ship.');
  if (!level.target) add('error', 'No target.');

  var fixtures = level.fixtures || [];
  var ids = {};
  var waypoints = [];
  for (i = 0; i < fixtures.length; i++) {
    f = fixtures[i];
    if (f.id != null) {
      if (ids[f.id]) add('error', 'Duplicate fixture id "' + f.id + '".');
      ids[f.id] = 1;
    }
    if (f.type === 'waypoint') waypoints.push(f);
    if (f.type === 'wormhole' && (!f.a || !f.b)) add('error', 'Wormhole "' + f.id + '" is missing a mouth.');
  }
  if (waypoints.length) {
    var orders = waypoints.map(function (w) { return w.order; }).slice().sort(function (a, b) { return a - b; });
    var good = true;
    for (i = 0; i < orders.length; i++) if (orders[i] !== i + 1) good = false;
    if (!good) add('error', 'Waypoint order must be 1..' + waypoints.length + ' with no gaps or repeats.');
  }

  var sol = level.solution || [];
  if (!sol.length) {
    add('warn', 'No authored solution.');
  } else {
    var v = validateWells(level, sol);
    if (!v.ok) add('error', 'Solution is not a legal placement (' + v.reason + '): ' + v.message);
    for (i = 0; i < sol.length; i++) {
      var one = validateWells(level, [sol[i]]);
      if (!one.ok && one.reason !== 'budget') {
        add('error', 'Solution well ' + (i + 1) + ': ' + one.message + ' (' + one.reason + ').');
      }
    }
    progress(id, 'lint', 0.1, 'running the authored solution');
    await yieldToQueue();
    if (cancelled || id !== jobId) return null;
    var res = run(level, sol, { maxSeconds: MAX_SECONDS });
    if (res.outcome !== 'win') add('error', 'The authored solution does not win (' + res.outcome + (res.reason ? ': ' + res.reason : '') + ').');
    else add('ok', 'Authored solution wins at t = ' + res.t.toFixed(2) + 's.');
  }

  progress(id, 'lint', 0.2, 'checking zero wells');
  await yieldToQueue();
  if (cancelled || id !== jobId) return null;
  var empty = run(level, [], { maxSeconds: MAX_SECONDS });
  if (empty.outcome === 'win') add('error', 'Zero wells already wins — this is not a puzzle yet.');
  else add('ok', 'Zero wells fails (' + (empty.reason || empty.outcome) + ').');

  if (sol.length) {
    var tol = await tolerance(id, level, { wells: sol, step: 10, window: 150, floor: floor });
    if (!tol) return null;
    for (i = 0; i < tol.wells.length; i++) {
      var tw = tol.wells[i];
      if (tw.r < floor) add('warn', 'Well ' + (i + 1) + ' tolerance ' + Math.round(tw.r) + ' < floor ' + floor + '.');
      else add('ok', 'Well ' + (i + 1) + ' tolerance ' + Math.round(tw.r) + '.');
    }
  }

  // The headline check: if one well anywhere solves it, the level is samey.
  progress(id, 'lint', 0.5, 'single-well sweep');
  var single = await minSingleWellCharges(id, level, step);
  if (!single) return null;
  if (single.charges > 0) {
    add('warn', 'Solvable with one well: ' + single.charges + ' charge' + (single.charges === 1 ? '' : 's') +
      ' is enough (' + single.regions + ' distinct region' + (single.regions === 1 ? '' : 's') +
      ', ' + Math.round(single.winArea) + ' u² of winning area at step ' + step + ').');
  } else {
    add('ok', 'No single well solves this level.');
  }

  var rate = randomWinRate(level, opts.randomSamples || 120, 1234);
  add('info', 'Random legal placements win ' + (rate.rate * 100).toFixed(1) + '% of the time (' +
    rate.wins + '/' + rate.samples + ').');

  progress(id, 'lint', 1, 'done');
  return { notes: notes, single: single, physicsVersion: PHYSICS_VERSION };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

self.onmessage = function (e) {
  var msg = e.data || {};
  if (msg.cmd === 'cancel') {
    cancelled = true;
    return;
  }
  jobId = msg.id;
  cancelled = false;
  var id = msg.id;
  var level = msg.level;
  var opts = msg.opts || {};

  var work;
  if (msg.cmd === 'hotzone') {
    work = hotzone(id, level, opts).then(function (r) {
      if (!r) return null;
      post(id, {
        type: 'result', cmd: 'hotzone', charges: r.charges, step: r.step, cols: r.cols,
        rows: r.rows, cells: r.cells, winCells: r.winCells, winArea: r.winArea, regions: r.regions
      });
      return r;
    });
  } else if (msg.cmd === 'solve') {
    work = solve(id, level, opts).then(function (r) {
      if (r) post(id, { type: 'result', cmd: 'solve', families: r.families, winners: r.winners, tried: r.tried, samples: r.samples });
      return r;
    });
  } else if (msg.cmd === 'tolerance') {
    work = tolerance(id, level, opts).then(function (r) {
      if (r) post(id, { type: 'result', cmd: 'tolerance', wells: r.wells, floor: r.floor });
      return r;
    });
  } else if (msg.cmd === 'lint') {
    work = lint(id, level, opts).then(function (r) {
      if (r) post(id, { type: 'result', cmd: 'lint', notes: r.notes, single: r.single, physicsVersion: r.physicsVersion });
      return r;
    });
  } else {
    post(id, { type: 'error', message: 'Unknown command "' + msg.cmd + '"' });
    return;
  }

  work.then(function (r) {
    if (!r) post(id, { type: 'cancelled' });
  }).catch(function (err) {
    post(id, { type: 'error', message: (err && err.message) ? err.message : String(err) });
  });
};

// killRadius / SHIP_RADIUS are imported so the analyser and the renderer agree
// about what "too close" means; referenced here so bundlers/linters see them.
self.GW_ANALYSE_CONSTANTS = { killRadius: killRadius, SHIP_RADIUS: SHIP_RADIUS };
