// Gravity Well — hot-zone explorer (dev page, NOT linked from the game).
//
// Runs the same single-well lattice sweep as tools/hotzone.js, but in the
// browser, chunked across requestAnimationFrame so the page stays responsive,
// and painted as a translucent win/fail overlay on top of the real renderer.

import { createState, killRadius, run, validateWells, SHIP_RADIUS } from '../sim.js';
import { LEVELS } from '../levels.js';
import {
  classifyPoint, countRegions, toleranceRadius, floorFor,
  CELL_FAIL, CELL_WIN, CELL_OBSTACLE, CELL_SHIP, CELL_TARGET
} from './hotzone.js';
import {
  computeView, drawBackground, drawBounds, drawTarget, drawShip, drawBodies,
  drawWells, drawTrajectory, COLORS
} from '../render.js';

const MAX_SECONDS = 60;
const CHUNK_MS = 12; // budget per animation frame

const el = (id) => document.getElementById(id);
const canvas = el('cv');
const ctx = canvas.getContext('2d');

let level = LEVELS[0];
let sweep = null;       // { step, cols, rows, cells, charges, done }
let job = null;         // in-flight sweep cursor
let raf = 0;
let clock = 0;

// --------------------------------------------------------------------- setup

function fillLevelSelect() {
  const sel = el('level');
  let phase = 0;
  let group = null;
  for (const l of LEVELS) {
    if (l.phase !== phase) {
      phase = l.phase;
      group = document.createElement('optgroup');
      group.label = 'World ' + phase;
      sel.appendChild(group);
    }
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.id + '  ' + l.name + (l.optional ? '  ★' : '');
    group.appendChild(opt);
  }
  sel.value = level.id;
}

function selectLevel(id) {
  level = LEVELS.find((l) => l.id === id) || LEVELS[0];
  cancelJob();
  sweep = null;
  const slider = el('charges');
  slider.max = String(level.stackLimit);
  if (Number(slider.value) > level.stackLimit) slider.value = String(level.stackLimit);
  el('chargesOut').textContent = slider.value;
  renderLevelInfo();
  renderMetrics([]);
  renderSolution();
  el('status').textContent = '';
}

function renderLevelInfo() {
  const counts = {};
  for (const f of level.fixtures) counts[f.type] = (counts[f.type] || 0) + 1;
  const fx = Object.keys(counts).map((k) => counts[k] + '× ' + k).join(', ') || 'none';
  const bare = run(level, [], { maxSeconds: MAX_SECONDS });
  const solved = run(level, level.solution, { maxSeconds: MAX_SECONDS });
  el('levelInfo').innerHTML = [
    row('id', level.id + (level.optional ? ' ★' : '')),
    row('name', level.name),
    row('world', String(level.phase)),
    row('budget', level.charges + ' charges, stack ≤ ' + level.stackLimit),
    row('preview', level.previewSeconds + ' s'),
    row('fixtures', fx),
    row('no wells', tag(bare.outcome === 'fail', bare.outcome + '/' + bare.reason)),
    row('solution', tag(solved.outcome === 'win', solved.outcome + '/' + solved.reason + ' @ ' + solved.t.toFixed(2) + ' s')),
    row('floor', String(floorFor(level)))
  ].join('');
}

function row(k, v) {
  return '<div><span class="note">' + k + '</span> &nbsp;' + v + '</div>';
}
function tag(ok, text) {
  return '<span class="' + (ok ? 'good' : 'bad') + '">' + text + '</span>';
}

function renderSolution() {
  const v = validateWells(level, level.solution);
  const parts = [row('legal', tag(v.ok, v.ok ? 'yes' : v.message))];
  level.solution.forEach((w, i) => {
    parts.push(row('well ' + i, Math.round(w.x) + ', ' + Math.round(w.y) + '  ×' + w.charges +
      ' <button data-tol="' + i + '">tolerance</button>'));
  });
  const box = el('solution');
  box.innerHTML = parts.join('');
  box.querySelectorAll('button[data-tol]').forEach((b) => {
    b.addEventListener('click', () => {
      const i = Number(b.getAttribute('data-tol'));
      b.disabled = true;
      b.textContent = '…';
      setTimeout(() => {
        const t = toleranceRadius(level, level.solution, i, { step: 8, window: 150 });
        const floor = floorFor(level);
        b.outerHTML = '<span class="' + (t >= floor ? 'good' : 'bad') + '">tol ' + t + '</span>';
      }, 0);
    });
  });
}

function renderMetrics(rows) {
  const body = el('metrics').tBodies[0];
  body.innerHTML =
    '<tr><th>charges</th><th>win area</th><th>cells</th><th>regions</th></tr>' +
    rows.map((r) =>
      '<tr><td>' + r.charges + '</td><td>' + Math.round(r.winArea) + '</td><td>' +
      r.winCells + '/' + r.total + '</td><td>' + r.regions + '</td></tr>'
    ).join('');
}

// --------------------------------------------------------------------- sweep

function startSweep() {
  cancelJob();
  const step = Number(el('step').value);
  const charges = Number(el('charges').value);
  const cols = Math.max(1, Math.floor(level.bounds.w / step));
  const rows = Math.max(1, Math.floor(level.bounds.h / step));
  sweep = {
    step, cols, rows, charges,
    cells: new Uint8Array(cols * rows),
    winCells: 0,
    done: false
  };
  job = { i: 0, total: cols * rows };
  el('stop').disabled = false;
  el('sweep').disabled = true;
}

function cancelJob() {
  job = null;
  el('stop').disabled = true;
  el('sweep').disabled = false;
}

function stepSweep() {
  if (!job || !sweep) return;
  const t0 = performance.now();
  const { cols, step, charges } = sweep;
  while (job.i < job.total) {
    const c = job.i % cols;
    const r = (job.i - c) / cols;
    const x = (c + 0.5) * step;
    const y = (r + 0.5) * step;
    const kind = classifyPoint(level, x, y, charges);
    let v;
    if (kind === 'obstacle') v = CELL_OBSTACLE;
    else if (kind === 'ship') v = CELL_SHIP;
    else if (kind === 'target') v = CELL_TARGET;
    else {
      const wells = [{ x, y, charges }];
      v = validateWells(level, wells).ok &&
        run(level, wells, { maxSeconds: MAX_SECONDS }).outcome === 'win' ? CELL_WIN : CELL_FAIL;
    }
    if (v === CELL_WIN) sweep.winCells++;
    sweep.cells[job.i] = v;
    job.i++;
    if ((job.i & 15) === 0 && performance.now() - t0 > CHUNK_MS) break;
  }

  const pct = Math.round((100 * job.i) / job.total);
  el('status').textContent = 'sweeping ' + charges + '-charge lattice… ' + pct + '%';

  if (job.i >= job.total) {
    sweep.done = true;
    const regions = countRegions(sweep.cells, sweep.cols, sweep.rows);
    const winArea = sweep.winCells * step * step;
    const existing = [...el('metrics').tBodies[0].querySelectorAll('tr')].slice(1).map((tr) => ({
      charges: Number(tr.cells[0].textContent),
      winArea: Number(tr.cells[1].textContent),
      winCells: Number(tr.cells[2].textContent.split('/')[0]),
      total: Number(tr.cells[2].textContent.split('/')[1]),
      regions: Number(tr.cells[3].textContent)
    })).filter((r) => r.charges !== charges);
    existing.push({ charges, winArea, winCells: sweep.winCells, total: job.total, regions });
    existing.sort((a, b) => a.charges - b.charges);
    renderMetrics(existing);
    el('status').textContent =
      charges + ' charges: ' + Math.round(winArea) + ' u² over ' + regions + ' region' +
      (regions === 1 ? '' : 's');
    cancelJob();
  }
}

// -------------------------------------------------------------------- render

function resize() {
  const stage = canvas.parentElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  return { w, h, dpr };
}

const FILL = {};
FILL[CELL_WIN] = 'rgba(90,240,150,0.55)';
FILL[CELL_FAIL] = 'rgba(255,90,90,0.18)';
FILL[CELL_OBSTACLE] = 'rgba(150,160,190,0.35)';
FILL[CELL_SHIP] = 'rgba(150,160,190,0.35)';
FILL[CELL_TARGET] = 'rgba(150,160,190,0.35)';

function paintOverlay(view) {
  if (!sweep) return;
  const { cols, rows, step, cells } = sweep;
  const limit = job ? job.i : cols * rows;
  const w = Math.ceil(step * view.scale) + 1;
  const h = w;
  ctx.save();
  for (let i = 0; i < limit; i++) {
    const v = cells[i];
    const c = i % cols;
    const r = (i - c) / cols;
    ctx.fillStyle = FILL[v];
    ctx.fillRect(
      Math.floor(c * step * view.scale + view.ox),
      Math.floor(r * step * view.scale + view.oy),
      w, h
    );
  }
  ctx.restore();
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  clock = now / 1000;
  if (job) stepSweep();

  const { w, h, dpr } = resize();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(ctx, level.id, w, h, dpr);

  const view = computeView(w, h, level.bounds, { top: 10, bottom: 10, left: 10, right: 10 });
  drawBounds(ctx, view, level.bounds);
  paintOverlay(view);

  const state = createState(level, level.solution);
  drawBodies(ctx, view, state.bodies, clock, state.ship);
  drawTarget(ctx, view, level.target, clock);

  const preview = run(level, level.solution, { maxSeconds: MAX_SECONDS });
  drawTrajectory(ctx, view, preview.trace, { color: COLORS.ship, bright: true, markers: true });

  drawWells(ctx, view, level.solution, killRadius, {});
  drawShip(ctx, view, state.ship, SHIP_RADIUS, { showVelocity: true });
}

// --------------------------------------------------------------------- wiring

fillLevelSelect();
selectLevel(level.id);

el('level').addEventListener('change', (e) => selectLevel(e.target.value));
el('charges').addEventListener('input', (e) => { el('chargesOut').textContent = e.target.value; });
el('sweep').addEventListener('click', startSweep);
el('stop').addEventListener('click', () => { cancelJob(); el('status').textContent = 'stopped'; });
window.addEventListener('resize', resize);

raf = requestAnimationFrame(frame);
