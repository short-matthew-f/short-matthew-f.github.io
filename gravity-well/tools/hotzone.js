// Gravity Well — hot-zone / solvability tooling (stage 3).
//
// Node ESM CLI *and* importable library. The level tests import
// `toleranceRadius` / `PHASE_FLOOR` from here so the tool and the test can
// never disagree about what "comfortable margin" means.
//
// Usage:
//   node gravity-well/tools/hotzone.js [levelId|all] [--step 12] [--random 500] [--ascii]
//
// For each level it reports
//   * a single-well lattice sweep for every charge count 1..stackLimit:
//     winning area (units^2) and the number of 4-connected winning regions
//     (i.e. how many genuinely distinct one-well solutions exist), plus an
//     ASCII win map with --ascii;
//   * the per-well tolerance of the authored solution: hold the other wells
//     fixed, ray-march this well outward in 16 directions until the run stops
//     winning, and take the minimum first-failure distance (the radius of the
//     largest disc around the authored spot that still wins);
//   * with --random N, the win rate of N random legal configurations.

import { run, validateWells, killRadius, SHIP_RADIUS } from '../sim.js';
import { LEVELS } from '../levels.js';

// Minimum per-well tolerance a level of each phase must clear (SPEC.md).
export const PHASE_FLOOR = {
  1: 60, 2: 50, 3: 45, 4: 40, 5: 35, 6: 35, 7: 30, 8: 30, 9: 25, 10: 25, 11: 25, 12: 25
};

/** The tolerance floor a level must clear: its own override, else its phase's. */
export function floorFor(level) {
  if (level.minTolerance != null) return level.minTolerance;
  const f = PHASE_FLOOR[level.phase];
  return f != null ? f : 25;
}

const MAX_SECONDS = 60;

function runWins(level, wells) {
  const v = validateWells(level, wells);
  if (!v.ok) return false;
  const res = run(level, wells, { maxSeconds: MAX_SECONDS });
  return res.outcome === 'win';
}

// ---------------------------------------------------------------------------
// Lattice bookkeeping
// ---------------------------------------------------------------------------

function rectDist(b, x, y) {
  const cx = x < b.x ? b.x : x > b.x + b.w ? b.x + b.w : x;
  const cy = y < b.y ? b.y : y > b.y + b.h ? b.y + b.h : y;
  return Math.hypot(x - cx, y - cy);
}

/**
 * Cell classification for the sweep. 'obstacle' / 'ship' / 'target' cells are
 * skipped (a well cannot usefully be placed there); everything else is run.
 */
export function classifyPoint(level, x, y, charges) {
  const kr = killRadius(charges);
  const t = level.target;
  if (t && Math.hypot(x - t.x, y - t.y) < t.r + kr) return 'target';
  const s = level.ship;
  if (s && Math.hypot(x - s.x, y - s.y) < kr + SHIP_RADIUS + 4) return 'ship';
  const fixtures = level.fixtures || [];
  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    if (f.type !== 'obstacle') continue;
    const d = f.shape === 'rect' ? rectDist(f, x, y) : Math.hypot(x - f.x, y - f.y) - (f.r || 0);
    if (d < kr) return 'obstacle';
  }
  return 'open';
}

/**
 * Sweep a single well of `charges` over a lattice covering the whole board.
 * Returns { cols, rows, step, cells, winCells, winArea, regions } where
 * `cells` is a Uint8Array of CELL_* codes in row-major order.
 */
export const CELL_FAIL = 0;
export const CELL_WIN = 1;
export const CELL_OBSTACLE = 2;
export const CELL_SHIP = 3;
export const CELL_TARGET = 4;

export function sweepSingleWell(level, charges, step) {
  const st = step || 12;
  const cols = Math.max(1, Math.floor(level.bounds.w / st));
  const rows = Math.max(1, Math.floor(level.bounds.h / st));
  const cells = new Uint8Array(cols * rows);
  let winCells = 0;

  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) * st;
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * st;
      const kind = classifyPoint(level, x, y, charges);
      let v;
      if (kind === 'obstacle') v = CELL_OBSTACLE;
      else if (kind === 'ship') v = CELL_SHIP;
      else if (kind === 'target') v = CELL_TARGET;
      else v = runWins(level, [{ x: x, y: y, charges: charges }]) ? CELL_WIN : CELL_FAIL;
      if (v === CELL_WIN) winCells++;
      cells[r * cols + c] = v;
    }
  }

  return {
    charges: charges,
    step: st,
    cols: cols,
    rows: rows,
    cells: cells,
    winCells: winCells,
    winArea: winCells * st * st,
    regions: countRegions(cells, cols, rows)
  };
}

/** Number of 4-connected components of winning cells. */
export function countRegions(cells, cols, rows) {
  const seen = new Uint8Array(cols * rows);
  const stack = [];
  let regions = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== CELL_WIN || seen[i]) continue;
    regions++;
    stack.length = 0;
    stack.push(i);
    seen[i] = 1;
    while (stack.length) {
      const k = stack.pop();
      const c = k % cols;
      const r = (k - c) / cols;
      if (c > 0) pushIf(k - 1);
      if (c < cols - 1) pushIf(k + 1);
      if (r > 0) pushIf(k - cols);
      if (r < rows - 1) pushIf(k + cols);
    }
  }
  return regions;

  function pushIf(j) {
    if (!seen[j] && cells[j] === CELL_WIN) {
      seen[j] = 1;
      stack.push(j);
    }
  }
}

const CHARS = { 0: '.', 1: '#', 2: 'o', 3: 'S', 4: 'T' };

export function asciiMap(sweep) {
  const lines = [];
  for (let r = 0; r < sweep.rows; r++) {
    let line = '';
    for (let c = 0; c < sweep.cols; c++) line += CHARS[sweep.cells[r * sweep.cols + c]];
    lines.push(line);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Per-well tolerance
// ---------------------------------------------------------------------------

const RAYS = 16;

/**
 * Largest disc radius around `wells[index]` that still wins, holding every
 * other well fixed. Ray-marches outward in 16 evenly spaced directions in
 * `step` increments up to `window` units and returns the minimum distance at
 * which the run first stops winning (capped at `window`).
 *
 * Out-of-bounds placements count as failures, so a well parked against an edge
 * genuinely scores low — that is the point.
 */
export function toleranceRadius(level, wells, index, opts) {
  const o = opts || {};
  const step = o.step || 8;
  const win = o.window || 150;
  const base = wells[index];
  let best = win;

  for (let k = 0; k < RAYS; k++) {
    const a = (2 * Math.PI * k) / RAYS;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let firstFail = win;
    for (let d = step; d <= win; d += step) {
      const probe = wells.slice();
      probe[index] = { x: base.x + dx * d, y: base.y + dy * d, charges: base.charges };
      if (!runWins(level, probe)) {
        firstFail = d;
        break;
      }
    }
    if (firstFail < best) best = firstFail;
    if (best <= step) break;
  }
  return best;
}

/** Tolerance of every authored well in `wells`. */
export function toleranceReport(level, wells, opts) {
  const out = [];
  for (let i = 0; i < wells.length; i++) out.push(toleranceRadius(level, wells, i, opts));
  return out;
}

// ---------------------------------------------------------------------------
// Random configuration sampling
// ---------------------------------------------------------------------------

/** Deterministic 32-bit LCG so repeated runs of the tool agree. */
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashId(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Sample `n` random legal configurations: well count uniform in 1..charges,
 * positions uniform in bounds, the charge budget split randomly across the
 * wells (respecting stackLimit). Returns the win rate.
 */
export function randomWinRate(level, n, seed) {
  const rng = makeRng(seed != null ? seed : hashId(level.id));
  const budget = level.charges;
  const stackLimit = level.stackLimit != null ? level.stackLimit : budget;
  let wins = 0;
  let sampled = 0;

  for (let i = 0; i < n; i++) {
    const count = 1 + Math.floor(rng() * budget);
    const split = splitCharges(rng, budget, count, stackLimit);
    if (!split) continue;
    const wells = [];
    for (let j = 0; j < split.length; j++) {
      wells.push({
        x: rng() * level.bounds.w,
        y: rng() * level.bounds.h,
        charges: split[j]
      });
    }
    sampled++;
    if (runWins(level, wells)) wins++;
  }
  return { samples: sampled, wins: wins, rate: sampled ? wins / sampled : 0 };
}

function splitCharges(rng, budget, count, stackLimit) {
  if (count > budget) return null;
  const out = new Array(count).fill(1);
  let left = budget - count;
  let guard = 0;
  while (left > 0 && guard++ < 200) {
    const k = Math.floor(rng() * count);
    if (out[k] < stackLimit) {
      out[k]++;
      left--;
    } else if (out.every((v) => v >= stackLimit)) {
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function fmt(n, d) {
  return Number(n).toFixed(d == null ? 1 : d);
}

function reportLevel(level, opts) {
  const stackLimit = level.stackLimit != null ? level.stackLimit : level.charges;
  const lines = [];
  lines.push(
    '=== ' + level.id + '  ' + (level.name || '') +
    '  [phase ' + level.phase + (level.optional ? ', optional' : '') + ']' +
    '  charges ' + level.charges + '  stack ' + stackLimit
  );

  const zero = run(level, [], { maxSeconds: MAX_SECONDS });
  lines.push('  zero wells: ' + zero.outcome + ' (' + zero.reason + ') @ t=' + fmt(zero.t, 2));

  const sol = level.solution || [];
  const v = validateWells(level, sol);
  const solRes = run(level, sol, { maxSeconds: MAX_SECONDS });
  lines.push(
    '  solution:   ' + solRes.outcome + ' (' + solRes.reason + ') @ t=' + fmt(solRes.t, 2) +
    '  wells=' + sol.map((w) => fmt(w.x, 0) + ',' + fmt(w.y, 0) + 'x' + w.charges).join(' ') +
    (v.ok ? '' : '  !! INVALID: ' + v.message) +
    (solRes.oreDelivered ? '  ore+' + solRes.oreDelivered : '')
  );

  const floor = floorFor(level);
  const tols = toleranceReport(level, sol, { step: 8, window: 150 });
  lines.push(
    '  tolerance:  [' + tols.map((t) => fmt(t, 0)).join(', ') + ']  floor ' + floor +
    (tols.length && Math.min.apply(null, tols) >= floor ? '  OK' : '  !! BELOW FLOOR')
  );

  for (let n = 1; n <= stackLimit; n++) {
    const sw = sweepSingleWell(level, n, opts.step);
    lines.push(
      '  sweep ' + n + 'ch: winArea ' + Math.round(sw.winArea) + ' u^2  cells ' + sw.winCells +
      '/' + sw.cols * sw.rows + '  regions ' + sw.regions
    );
    if (opts.ascii) lines.push(asciiMap(sw));
  }

  if (opts.random) {
    const r = randomWinRate(level, opts.random);
    lines.push('  random ' + r.samples + ': wins ' + r.wins + '  rate ' + fmt(100 * r.rate, 2) + '%');
  }

  return lines.join('\n');
}

function main(argv) {
  const opts = { step: 12, ascii: false, random: 0 };
  let which = 'all';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--step') opts.step = Number(argv[++i]);
    else if (a === '--random') opts.random = Number(argv[++i]);
    else if (a === '--ascii') opts.ascii = true;
    else if (a.startsWith('--')) throw new Error('unknown flag ' + a);
    else which = a;
  }

  const levels = which === 'all' ? LEVELS : LEVELS.filter((l) => l.id === which);
  if (!levels.length) {
    console.error('no level matching "' + which + '"');
    process.exitCode = 1;
    return;
  }
  for (let i = 0; i < levels.length; i++) console.log(reportLevel(levels[i], opts));
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === new URL('file://' + process.argv[1]).href;

if (invokedDirectly) main(process.argv.slice(2));
