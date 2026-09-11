// Gravity Well — deterministic simulation core (stage 1).
//
// Pure ES module: no DOM, no Math.random, no Date, no wall-clock.
// Everything here is a function of (level, wells) plus a fixed number of
// fixed-size steps, so the same inputs always produce the same trace.
//
// Conventions
// -----------
// * World coords are floats, y grows DOWN (canvas convention).
// * Time is seconds; the sim advances in fixed DT chunks.
// * `state.t` is always `state.steps * DT` (never an accumulated sum), so time
//   is exact for a given step count and path movers are replayable.
//
// Gravity model
// -------------
//   a = G * n * d / (|d|^2 + EPS^2)^(3/2)      d = (well - body), n = charges
//
// EPS softens the singularity so a near miss is a hard kick rather than an
// infinity, and so the numbers stay finite inside the lethal core.
//
// Tuning (G = 5.2e5, EPS = 40). `node test/tune.js` flies the ship at 120 u/s
// past a single well at impact parameter b and prints the measured bend plus
// the gap left between the ship and the lethal core:
//
//   charges   b=100            b=150            b=200
//     1       33 deg, gap 49   26 deg, gap 99   20 deg, gap 152
//     2       58 deg, gap 30   51 deg, gap 78   41 deg, gap 131
//     3       72 deg, gap 18   73 deg, gap 59   63 deg, gap 110
//
// So 1 charge at ~150 units is a gentle, survivable bend of a couple of tens
// of degrees, while 3 charges at ~100 units swings the ship through ~70 deg
// with only ~18 units of clearance from the core — a real capture risk (at
// b = 60..80 a 3-charge well grazes or eats the ship). Because the field is
// conservative and static, a flyby cannot be captured into an orbit: "capture"
// in play means the bend is sharp enough to curve the ship into the core.
//
// EPS also flattens the force inside r < EPS, which is why very small impact
// parameters bend *less* than mid-range ones.
//
// PHYSICS_VERSION keys shared solutions to these constants: if G, EPS, DT,
// killRadius or the integration order change, bump it.

export const PHYSICS_VERSION = 'gw-1';

export const DT = 1 / 120;
export const MAX_FLIGHT_SECONDS = 90;
export const G = 5.2e5;
export const EPS = 40;
export const SHIP_RADIUS = 10;

// Prediction sampling period (spec: 1/20 s). DT divides it exactly.
export const PREDICT_SAMPLE_DT = 1 / 20;
const SAMPLE_STEPS = Math.round(PREDICT_SAMPLE_DT / DT); // 6

// Fully elastic collisions (spec: restitution 1.0).
export const RESTITUTION = 1;

// Hunter defaults (per-fixture `accel` / `maxSpeed` override these).
export const HUNTER_ACCEL = 60;
export const HUNTER_MAX_SPEED = 140;

// Reference density for mass: mass = r^2 / 100, so the ship (r = 10) has mass 1.
const MASS_SCALE = 1 / 100;

// Types that are deadly to the ship on contact. `immune: true` on any fixture
// also makes it deadly (see bodyIsLethal).
const LETHAL_TYPES = { obstacle: 1, asteroid: 1, drone: 1, hunter: 1 };

// Types that never take part in the collision pass (pure zones).
const ZONE_TYPES = { oreReceiver: 1 };

// Types that feel the gravity field.
const RESPONSIVE_TYPES = { drone: 1, hunter: 1, ore: 1 };

// Types that are removed when they drift outside the level bounds.
const BOUNDED_TYPES = { asteroid: 1, drone: 1, hunter: 1, ore: 1 };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** JSON deep copy — mobile-Safari safe (no structuredClone). */
export function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

/** Lethal core radius of a well holding `n` charges. */
export function killRadius(n) {
  return 14 + 6 * Math.sqrt(n);
}

/** Does contact with this body kill the ship? */
export function bodyIsLethal(body) {
  if (!body || ZONE_TYPES[body.type]) return false;
  if (body.immune) return true;
  return !!LETHAL_TYPES[body.type];
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function isRect(body) {
  return body.shape === 'rect';
}

/** Inverse mass; static and kinematic bodies are immovable. */
function invMass(body) {
  if (body.static || body.kinematic) return 0;
  return body.mass > 0 ? 1 / body.mass : 0;
}

function pushEvent(state, kind, id, extra) {
  const ev = { t: state.t, kind: kind, id: id };
  if (extra) {
    for (const k in extra) ev[k] = extra[k];
  }
  state.events.push(ev);
}

// ---------------------------------------------------------------------------
// Gravity field
// ---------------------------------------------------------------------------

/**
 * Gravity acceleration produced by `wells` at world point (x, y).
 * Used by the sim and by the renderer's field arrows.
 */
export function fieldAt(wells, x, y) {
  let ax = 0;
  let ay = 0;
  for (let i = 0; i < wells.length; i++) {
    const w = wells[i];
    const dx = w.x - x;
    const dy = w.y - y;
    const soft = dx * dx + dy * dy + EPS * EPS;
    const f = (G * w.charges) / (soft * Math.sqrt(soft));
    ax += f * dx;
    ay += f * dy;
  }
  return { ax: ax, ay: ay };
}

// ---------------------------------------------------------------------------
// Kinematic patrol paths
//
// A path mover's position is a pure function of its own path time, so it is
// exactly reproducible and can be evaluated for previews without stepping.
// `loop: true` closes the polyline into a circuit; otherwise the body travels
// the polyline once and then holds at the final point.
// ---------------------------------------------------------------------------

function buildPath(points, loop) {
  const pts = [];
  for (let i = 0; i < points.length; i++) {
    pts.push({ x: points[i].x, y: points[i].y });
  }
  const segs = [];
  let total = 0;
  const last = loop && pts.length > 2 ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len <= 0) continue;
    segs.push({ x: a.x, y: a.y, dx: dx / len, dy: dy / len, len: len });
    total += len;
  }
  return { points: pts, segs: segs, total: total, loop: !!loop };
}

/** Position + unit direction along a path at path-time `t`. Pure. */
function pathAt(path, speed, t) {
  if (path.segs.length === 0) {
    const p = path.points[0] || { x: 0, y: 0 };
    return { x: p.x, y: p.y, dx: 0, dy: 0 };
  }
  let s = speed * t;
  if (path.loop) {
    s = s % path.total;
    if (s < 0) s += path.total;
  } else {
    s = clamp(s, 0, path.total);
  }
  for (let i = 0; i < path.segs.length; i++) {
    const seg = path.segs[i];
    if (s <= seg.len || i === path.segs.length - 1) {
      const d = clamp(s, 0, seg.len);
      return { x: seg.x + seg.dx * d, y: seg.y + seg.dy * d, dx: seg.dx, dy: seg.dy };
    }
    s -= seg.len;
  }
  const lastSeg = path.segs[path.segs.length - 1];
  return { x: lastSeg.x + lastSeg.dx * lastSeg.len, y: lastSeg.y + lastSeg.dy * lastSeg.len, dx: lastSeg.dx, dy: lastSeg.dy };
}

// ---------------------------------------------------------------------------
// State construction
// ---------------------------------------------------------------------------

function makeBody(fx, index) {
  const type = fx.type;
  const body = {
    id: fx.id != null ? String(fx.id) : type + String(index),
    type: type,
    shape: fx.shape === 'rect' ? 'rect' : 'circle',
    x: fx.x || 0,
    y: fx.y || 0,
    vx: fx.vx || 0,
    vy: fx.vy || 0,
    r: fx.r != null ? fx.r : 12,
    mass: 0,
    alive: true,
    immune: !!fx.immune,
    static: false,
    kinematic: false,
    responsive: !!RESPONSIVE_TYPES[type],
    lethal: false
  };

  if (body.shape === 'rect') {
    // (x, y) is the top-left corner; w/h are the full extents.
    body.w = fx.w || 0;
    body.h = fx.h || 0;
    body.r = 0.5 * Math.sqrt(body.w * body.w + body.h * body.h); // bounding radius
  }

  if (type === 'obstacle' || type === 'oreReceiver') {
    body.static = true;
    body.vx = 0;
    body.vy = 0;
  }

  if (type === 'asteroid' && fx.path && fx.path.length > 0) {
    // Kinematic patrol: motion ignores collisions, but it still kills/bounces
    // everything it touches.
    body.kinematic = true;
    body.path = buildPath(fx.path, fx.loop !== false);
    body.speed = fx.speed != null ? fx.speed : 60;
    body.pathT0 = fx.pathT != null ? fx.pathT : 0;
    body.pathT = body.pathT0;
    const p = pathAt(body.path, body.speed, body.pathT);
    body.x = p.x;
    body.y = p.y;
    body.vx = p.dx * body.speed;
    body.vy = p.dy * body.speed;
  }

  if (type === 'hunter') {
    body.accel = fx.accel != null ? fx.accel : HUNTER_ACCEL;
    body.maxSpeed = fx.maxSpeed != null ? fx.maxSpeed : HUNTER_MAX_SPEED;
  }

  body.mass = body.static || body.kinematic ? Infinity : Math.max(0.0001, body.r * body.r * MASS_SCALE);
  body.lethal = bodyIsLethal(body);
  return body;
}

/**
 * Deep-copies `level` into a fresh mutable state with the player's wells baked
 * in. `wells` is [{x, y, charges}]; it is copied, never aliased.
 */
export function createState(level, wells) {
  const src = cloneLevel(level);
  const placed = [];
  const list = wells || [];
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const charges = Math.max(1, Math.round(w.charges || 1));
    placed.push({ id: 'well' + String(i), x: w.x, y: w.y, charges: charges, r: killRadius(charges) });
  }

  const bodies = [];
  const fixtures = src.fixtures || [];
  for (let i = 0; i < fixtures.length; i++) bodies.push(makeBody(fixtures[i], i));

  const state = {
    physicsVersion: PHYSICS_VERSION,
    level: src,
    bounds: { w: src.bounds.w, h: src.bounds.h },
    steps: 0,
    t: 0,
    ship: {
      id: 'ship',
      type: 'ship',
      shape: 'circle',
      x: src.ship.x,
      y: src.ship.y,
      vx: src.ship.vx || 0,
      vy: src.ship.vy || 0,
      r: SHIP_RADIUS,
      mass: SHIP_RADIUS * SHIP_RADIUS * MASS_SCALE,
      alive: true,
      immune: false,
      static: false,
      kinematic: false,
      responsive: true,
      lethal: false
    },
    target: src.target ? { x: src.target.x, y: src.target.y, r: src.target.r } : null,
    bodies: bodies,
    wells: placed,
    oreDelivered: 0,
    oreLost: 0,
    outcome: null,
    reason: null,
    events: []
  };
  return state;
}

// ---------------------------------------------------------------------------
// Integration (semi-implicit Euler)
//
// One sequential pass: ship first, then bodies in level order. Wells are
// static, so the only cross-body coupling is hunter -> ship, and the hunter
// deliberately reads the ship position already updated this step.
// ---------------------------------------------------------------------------

function integrateResponsive(state, body) {
  const a = fieldAt(state.wells, body.x, body.y);
  let ax = a.ax;
  let ay = a.ay;

  if (body.type === 'hunter' && state.ship.alive) {
    const dx = state.ship.x - body.x;
    const dy = state.ship.y - body.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1e-9) {
      ax += (body.accel * dx) / d;
      ay += (body.accel * dy) / d;
    }
  }

  body.vx += ax * DT;
  body.vy += ay * DT;

  if (body.type === 'hunter') {
    const sp = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
    if (sp > body.maxSpeed && sp > 1e-9) {
      const k = body.maxSpeed / sp;
      body.vx *= k;
      body.vy *= k;
    }
  }

  body.x += body.vx * DT;
  body.y += body.vy * DT;
}

function integrate(state) {
  const ship = state.ship;
  if (ship.alive) integrateResponsive(state, ship);

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    if (!b.alive || b.static) continue;
    if (b.kinematic) {
      // Pure function of path time: exactly replayable.
      b.pathT = b.pathT0 + state.t;
      const p = pathAt(b.path, b.speed, b.pathT);
      b.x = p.x;
      b.y = p.y;
      b.vx = p.dx * b.speed;
      b.vy = p.dy * b.speed;
      continue;
    }
    if (b.responsive) {
      integrateResponsive(state, b);
    } else {
      // Inert mover: constant velocity.
      b.x += b.vx * DT;
      b.y += b.vy * DT;
    }
  }
}

// ---------------------------------------------------------------------------
// Well consumption (runs before the collision pass each step)
// ---------------------------------------------------------------------------

function killShip(state, reason, otherId) {
  state.ship.alive = false;
  state.outcome = 'fail';
  state.reason = reason;
  pushEvent(state, 'shipDied', 'ship', { reason: reason, other: otherId });
}

function wellPass(state) {
  const wells = state.wells;
  if (wells.length === 0) return;

  for (let i = 0; i < wells.length; i++) {
    const w = wells[i];
    if (state.ship.alive) {
      const dx = state.ship.x - w.x;
      const dy = state.ship.y - w.y;
      if (dx * dx + dy * dy <= w.r * w.r) {
        pushEvent(state, 'consumed', 'ship', { other: w.id });
        killShip(state, 'well', w.id);
        return;
      }
    }
  }

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    if (!b.alive || b.immune || b.static) continue;
    for (let j = 0; j < wells.length; j++) {
      const w = wells[j];
      const dx = b.x - w.x;
      const dy = b.y - w.y;
      if (dx * dx + dy * dy <= w.r * w.r) {
        b.alive = false;
        if (b.type === 'ore') state.oreLost += 1;
        pushEvent(state, 'consumed', b.id, { other: w.id });
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Collisions
//
// One pass per step over pairs (i < j) of [ship, ...aliveBodies] in a fixed
// order. Circles use centre distance; rects (always static obstacles) use the
// closest point on the box. Contact normals point from a towards b.
// ---------------------------------------------------------------------------

function circleCircleContact(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rsum = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rsum * rsum) return null;
  const d = Math.sqrt(d2);
  if (d < 1e-9) return { nx: 1, ny: 0, depth: rsum };
  return { nx: dx / d, ny: dy / d, depth: rsum - d };
}

/** Contact normal from circle `c` towards rect `r` (rect x,y = top-left). */
function circleRectContact(c, r) {
  const px = clamp(c.x, r.x, r.x + r.w);
  const py = clamp(c.y, r.y, r.y + r.h);
  const dx = c.x - px;
  const dy = c.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 > 1e-12) {
    if (d2 >= c.r * c.r) return null;
    const d = Math.sqrt(d2);
    return { nx: -dx / d, ny: -dy / d, depth: c.r - d };
  }
  // Centre is inside the box: escape along the shallowest face.
  const left = c.x - r.x;
  const right = r.x + r.w - c.x;
  const top = c.y - r.y;
  const bottom = r.y + r.h - c.y;
  let nx = 1;
  let ny = 0;
  let m = left;
  if (right < m) { m = right; nx = -1; ny = 0; }
  if (top < m) { m = top; nx = 0; ny = 1; }
  if (bottom < m) { m = bottom; nx = 0; ny = -1; }
  return { nx: nx, ny: ny, depth: c.r + m };
}

function contactBetween(a, b) {
  if (isRect(a) && isRect(b)) return null; // both static obstacles
  if (isRect(b)) return circleRectContact(a, b);
  if (isRect(a)) {
    const c = circleRectContact(b, a);
    if (!c) return null;
    return { nx: -c.nx, ny: -c.ny, depth: c.depth };
  }
  return circleCircleContact(a, b);
}

/** Elastic impulse + positional separation along a normal pointing a -> b. */
function resolveContact(a, b, c) {
  const ima = invMass(a);
  const imb = invMass(b);
  const imSum = ima + imb;
  if (imSum <= 0) return;

  const corr = c.depth / imSum;
  a.x -= c.nx * corr * ima;
  a.y -= c.ny * corr * ima;
  b.x += c.nx * corr * imb;
  b.y += c.ny * corr * imb;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const vn = rvx * c.nx + rvy * c.ny;
  if (vn >= 0) return; // already separating
  const j = (-(1 + RESTITUTION) * vn) / imSum;
  a.vx -= j * c.nx * ima;
  a.vy -= j * c.ny * ima;
  b.vx += j * c.nx * imb;
  b.vy += j * c.ny * imb;
}

function collisionPass(state) {
  const list = [];
  if (state.ship.alive) list.push(state.ship);
  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    if (b.alive && !ZONE_TYPES[b.type]) list.push(b);
  }

  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!a.alive || !b.alive) continue;
      if (a.static && b.static) continue;
      if (a.kinematic && b.kinematic) continue;
      const c = contactBetween(a, b);
      if (!c) continue;

      if (a.type === 'ship' || b.type === 'ship') {
        const other = a.type === 'ship' ? b : a;
        if (other.lethal) {
          const reason = other.immune && !LETHAL_TYPES[other.type] ? 'immune' : other.type;
          pushEvent(state, 'collision', 'ship', { other: other.id });
          killShip(state, reason, other.id);
          return; // ship contact with a lethal thing ends the sim immediately
        }
        pushEvent(state, 'collision', 'ship', { other: other.id });
        resolveContact(a, b, c);
        continue;
      }

      pushEvent(state, 'collision', a.id, { other: b.id });
      resolveContact(a, b, c);
    }
  }
}

// ---------------------------------------------------------------------------
// Bounds, ore delivery, win condition
// ---------------------------------------------------------------------------

function outOfBounds(state, body) {
  const w = state.bounds.w;
  const h = state.bounds.h;
  const r = body.r;
  return body.x < -r || body.x > w + r || body.y < -r || body.y > h + r;
}

function boundsPass(state) {
  if (state.ship.alive && outOfBounds(state, state.ship)) {
    pushEvent(state, 'left', 'ship');
    killShip(state, 'lost', null);
    return;
  }
  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    if (!b.alive || b.kinematic || !BOUNDED_TYPES[b.type]) continue;
    if (outOfBounds(state, b)) {
      b.alive = false;
      if (b.type === 'ore') state.oreLost += 1;
      pushEvent(state, 'left', b.id);
    }
  }
}

function receiverPass(state) {
  for (let i = 0; i < state.bodies.length; i++) {
    const rec = state.bodies[i];
    if (!rec.alive || rec.type !== 'oreReceiver') continue;
    for (let j = 0; j < state.bodies.length; j++) {
      const ore = state.bodies[j];
      if (!ore.alive || ore.type !== 'ore') continue;
      const dx = ore.x - rec.x;
      const dy = ore.y - rec.y;
      if (dx * dx + dy * dy <= rec.r * rec.r) {
        ore.alive = false;
        state.oreDelivered += 1;
        pushEvent(state, 'delivered', ore.id, { other: rec.id });
      }
    }
  }
}

function winPass(state) {
  if (!state.ship.alive || !state.target) return;
  const dx = state.ship.x - state.target.x;
  const dy = state.ship.y - state.target.y;
  const rr = state.target.r + SHIP_RADIUS;
  if (dx * dx + dy * dy <= rr * rr) {
    state.outcome = 'win';
    state.reason = 'target';
    pushEvent(state, 'win', 'ship');
  }
}

// ---------------------------------------------------------------------------
// Stepping
// ---------------------------------------------------------------------------

/** Advance the sim by exactly one DT. Sets state.outcome when the run ends. */
export function step(state) {
  if (state.outcome) return state;

  state.steps += 1;
  state.t = state.steps * DT;

  integrate(state);

  wellPass(state);
  if (state.outcome) return state;

  collisionPass(state);
  if (state.outcome) return state;

  boundsPass(state);
  if (state.outcome) return state;

  receiverPass(state);
  winPass(state);
  if (state.outcome) return state;

  if (state.t >= MAX_FLIGHT_SECONDS) {
    state.outcome = 'fail';
    state.reason = 'drift';
    pushEvent(state, 'shipDied', 'ship', { reason: 'drift' });
  }
  return state;
}

function sampleShip(state) {
  return { t: state.t, x: state.ship.x, y: state.ship.y, vx: state.ship.vx, vy: state.ship.vy };
}

/**
 * Run a whole flight. `maxSeconds` defaults to MAX_FLIGHT_SECONDS; hitting it
 * with the ship still alive is a 'drift' failure.
 * Returns { outcome, reason, t, trace, events, oreDelivered, oreLost, state }.
 * `trace` samples the ship every PREDICT_SAMPLE_DT (plus the final instant).
 */
export function run(level, wells, opts) {
  const maxSeconds = opts && opts.maxSeconds != null ? opts.maxSeconds : MAX_FLIGHT_SECONDS;
  const state = createState(level, wells);
  const trace = [sampleShip(state)];

  while (!state.outcome && state.t < maxSeconds) {
    step(state);
    if (state.steps % SAMPLE_STEPS === 0) trace.push(sampleShip(state));
  }
  if (state.steps % SAMPLE_STEPS !== 0) trace.push(sampleShip(state));

  if (!state.outcome) {
    state.outcome = 'fail';
    state.reason = 'drift';
    pushEvent(state, 'shipDied', 'ship', { reason: 'drift' });
  }

  return {
    outcome: state.outcome,
    reason: state.reason,
    t: state.t,
    trace: trace,
    events: state.events,
    oreDelivered: state.oreDelivered,
    oreLost: state.oreLost,
    state: state
  };
}

// ---------------------------------------------------------------------------
// Prediction (planning-state preview)
// ---------------------------------------------------------------------------

/** Surface gap between the ship and another body (0 when overlapping). */
function gapToShip(ship, body) {
  let d;
  if (isRect(body)) {
    const px = clamp(ship.x, body.x, body.x + body.w);
    const py = clamp(ship.y, body.y, body.y + body.h);
    d = Math.sqrt((ship.x - px) * (ship.x - px) + (ship.y - py) * (ship.y - py)) - ship.r;
  } else {
    d = Math.sqrt((ship.x - body.x) * (ship.x - body.x) + (ship.y - body.y) * (ship.y - body.y)) - ship.r - body.r;
  }
  return d < 0 ? 0 : d;
}

/**
 * Run a throwaway copy of the sim for `seconds` and report sampled paths.
 * Cheap enough to recompute on every planning gesture.
 * Returns { ship:[{t,x,y}], bodies:{[id]:[{t,x,y}]}, outcome|null, reason|null,
 *           closestApproach:{id,dist,t}|null, t }.
 * `closestApproach` is the minimum surface gap between the ship and any lethal
 * body or well core over the horizon, evaluated every DT (not just at samples).
 */
export function predict(level, wells, seconds) {
  const horizon = seconds != null ? seconds : 6;
  const state = createState(level, wells);
  const shipPath = [];
  const bodyPaths = {};
  let closest = null;

  const recordSample = function () {
    if (state.ship.alive) shipPath.push({ t: state.t, x: state.ship.x, y: state.ship.y });
    for (let i = 0; i < state.bodies.length; i++) {
      const b = state.bodies[i];
      if (!b.alive || b.static) continue;
      if (!bodyPaths[b.id]) bodyPaths[b.id] = [];
      bodyPaths[b.id].push({ t: state.t, x: b.x, y: b.y });
    }
  };

  const recordClosest = function () {
    if (!state.ship.alive) return;
    for (let i = 0; i < state.bodies.length; i++) {
      const b = state.bodies[i];
      if (!b.alive || !b.lethal) continue;
      const d = gapToShip(state.ship, b);
      if (!closest || d < closest.dist) closest = { id: b.id, dist: d, t: state.t };
    }
    for (let i = 0; i < state.wells.length; i++) {
      const w = state.wells[i];
      const dx = state.ship.x - w.x;
      const dy = state.ship.y - w.y;
      let d = Math.sqrt(dx * dx + dy * dy) - state.ship.r - w.r;
      if (d < 0) d = 0;
      if (!closest || d < closest.dist) closest = { id: w.id, dist: d, t: state.t };
    }
  };

  recordSample();
  recordClosest();
  while (!state.outcome && state.t < horizon) {
    step(state);
    recordClosest();
    if (state.steps % SAMPLE_STEPS === 0) recordSample();
  }
  if (state.steps % SAMPLE_STEPS !== 0) recordSample();

  return {
    ship: shipPath,
    bodies: bodyPaths,
    outcome: state.outcome,
    reason: state.reason,
    closestApproach: closest,
    t: state.t
  };
}

// ---------------------------------------------------------------------------
// Well placement validation
// ---------------------------------------------------------------------------

/**
 * Check a proposed well list against the level budget, stack limit and bounds.
 * Returns { ok, reason, message }; reason is null when ok, otherwise one of
 * 'stack' | 'budget' | 'bounds' | 'charges'.
 */
export function validateWells(level, wells) {
  const list = wells || [];
  const stackLimit = level.stackLimit != null ? level.stackLimit : level.charges;
  const budget = level.charges != null ? level.charges : 0;
  let total = 0;

  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const n = w.charges;
    if (!(typeof n === 'number') || !isFinite(n) || n < 1 || n !== Math.round(n)) {
      return { ok: false, reason: 'charges', message: 'Each well needs a whole number of charges' };
    }
    if (n > stackLimit) {
      return { ok: false, reason: 'stack', message: 'Max ' + stackLimit + ' charges in one well' };
    }
    if (!(typeof w.x === 'number') || !(typeof w.y === 'number') || !isFinite(w.x) || !isFinite(w.y)) {
      return { ok: false, reason: 'bounds', message: 'Well is outside the playfield' };
    }
    if (w.x < 0 || w.y < 0 || w.x > level.bounds.w || w.y > level.bounds.h) {
      return { ok: false, reason: 'bounds', message: 'Well is outside the playfield' };
    }
    total += n;
  }

  if (total > budget) {
    return { ok: false, reason: 'budget', message: 'No charges left' };
  }
  return { ok: true, reason: null, message: null };
}
