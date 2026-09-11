// node --test gravity-well/test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PHYSICS_VERSION,
  DT,
  MAX_FLIGHT_SECONDS,
  G,
  EPS,
  SHIP_RADIUS,
  PREDICT_SAMPLE_DT,
  HUNTER_LEASH,
  MIN_WELL_DISTANCE,
  WAYPOINT_RADIUS,
  WELL_REACH,
  WELL_TAPER,
  WORMHOLE_COOLDOWN,
  WORMHOLE_RADIUS,
  killRadius,
  willReturn,
  pointInZone,
  fieldAtState,
  cloneLevel,
  bodyIsLethal,
  createState,
  step,
  run,
  fieldAt,
  predict,
  validateWells
} from '../sim.js';

// --- helpers ---------------------------------------------------------------

/** A minimal level; `over` is merged over the defaults. */
function level(over) {
  const base = {
    id: 'test',
    name: 'Test',
    phase: 1,
    bounds: { w: 900, h: 1200 },
    charges: 3,
    stackLimit: 3,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 100, y: 600, vx: 120, vy: 0 },
    target: { x: 700, y: 600, r: 28 },
    fixtures: []
  };
  return Object.assign(base, over || {});
}

/** Step a state forward to (at most) `seconds`, stopping early on an outcome. */
function advance(state, seconds) {
  const want = Math.round(seconds / DT);
  while (state.steps < want && !state.outcome) step(state);
  return state;
}

function byId(state, id) {
  return state.bodies.find(function (b) { return b.id === id; });
}

function near(actual, expected, tol, msg) {
  assert.ok(Math.abs(actual - expected) <= tol, (msg || 'value') + ': expected ' + expected + ' +/- ' + tol + ', got ' + actual);
}

// --- constants -------------------------------------------------------------

test('constants and helpers', function () {
  assert.equal(PHYSICS_VERSION, 'gw-2');
  assert.equal(DT, 1 / 120);
  assert.equal(MAX_FLIGHT_SECONDS, 90);
  assert.equal(SHIP_RADIUS, 10);
  assert.ok(G > 0 && EPS > 0);
  assert.equal(PREDICT_SAMPLE_DT, 1 / 20);
  near(killRadius(1), 26, 1e-9, 'killRadius(1)');
  near(killRadius(4), 34, 1e-9, 'killRadius(4)');
  assert.ok(killRadius(3) < killRadius(4), 'grows with charges');
  assert.equal(WELL_REACH, 360);
  assert.equal(WELL_TAPER, 90);

  // cloneLevel is a deep copy, not an alias.
  const l = level({});
  const c = cloneLevel(l);
  c.ship.x = -1;
  assert.equal(l.ship.x, 100);

  assert.equal(bodyIsLethal({ type: 'obstacle' }), true);
  assert.equal(bodyIsLethal({ type: 'asteroid' }), true);
  assert.equal(bodyIsLethal({ type: 'drone' }), true);
  assert.equal(bodyIsLethal({ type: 'hunter' }), true);
  assert.equal(bodyIsLethal({ type: 'ore' }), false);
  assert.equal(bodyIsLethal({ type: 'ore', immune: true }), true);
  assert.equal(bodyIsLethal({ type: 'oreReceiver' }), false);
  assert.equal(bodyIsLethal({ type: 'oreReceiver', immune: true }), false);
});

test('fieldAt points at the well and grows with charges', function () {
  const a1 = fieldAt([{ x: 300, y: 600, charges: 1 }], 100, 600);
  assert.ok(a1.ax > 0, 'pulled towards +x');
  near(a1.ay, 0, 1e-12, 'no y component on the axis');
  const a3 = fieldAt([{ x: 300, y: 600, charges: 3 }], 100, 600);
  near(a3.ax / a1.ax, 3, 1e-9, 'linear in charges');
  assert.deepEqual(fieldAt([], 10, 10), { ax: 0, ay: 0 });
});

// --- determinism -----------------------------------------------------------

test('determinism: identical inputs give byte-identical traces', function () {
  const l = level({
    bounds: { w: 900, h: 1200 },
    charges: 4,
    ship: { x: 120, y: 1100, vx: 90, vy: -120 },
    target: { x: 780, y: 220, r: 28 },
    fixtures: [
      { type: 'obstacle', shape: 'rect', x: 380, y: 700, w: 120, h: 40 },
      { type: 'obstacle', shape: 'circle', x: 250, y: 420, r: 46 },
      { type: 'asteroid', r: 22, path: [{ x: 600, y: 300 }, { x: 600, y: 900 }], speed: 90, loop: true },
      { type: 'drone', r: 14, x: 700, y: 700, vx: -40, vy: 0 },
      { type: 'hunter', r: 14, x: 820, y: 1000 },
      { type: 'ore', r: 10, x: 300, y: 1000, vx: 30, vy: -20 },
      { type: 'oreReceiver', x: 150, y: 250, r: 50 }
    ]
  });
  const wells = [{ x: 420, y: 500, charges: 2 }, { x: 700, y: 480, charges: 1 }];

  const a = run(l, wells, {});
  const b = run(l, wells, {});
  assert.deepStrictEqual(a.trace, b.trace);
  assert.deepStrictEqual(a.events, b.events);
  assert.equal(a.outcome, b.outcome);
  assert.equal(a.reason, b.reason);
  assert.equal(a.t, b.t);
  assert.ok(a.trace.length > 10);

  // predict() must agree with run() over the horizon it covers.
  const p1 = predict(l, wells, 3);
  const p2 = predict(l, wells, 3);
  assert.deepStrictEqual(p1, p2);
  const shared = Math.min(p1.ship.length, a.trace.length);
  assert.ok(shared > 20, 'predict and run overlap');
  for (let i = 0; i < shared; i++) {
    near(p1.ship[i].t, a.trace[i].t, 1e-12, 'sample ' + i + ' time');
    near(p1.ship[i].x, a.trace[i].x, 1e-12, 'sample ' + i + ' x');
    near(p1.ship[i].y, a.trace[i].y, 1e-12, 'sample ' + i + ' y');
  }

  // run() must not mutate the level it was handed.
  assert.equal(l.fixtures.length, 7);
  assert.equal(l.ship.x, 120);
});

// --- basic flight ----------------------------------------------------------

test('zero wells: the ship flies straight and reaches a target ahead of it', function () {
  const res = run(level({}), [], {});
  assert.equal(res.outcome, 'win');
  assert.equal(res.reason, 'target');
  // Touches the target circle at x = 700 - 28 - 10 = 662 -> t = 562/120.
  near(res.t, 562 / 120, 0.02, 'win time');
  for (const s of res.trace) near(s.y, 600, 1e-9, 'no y drift');
  assert.ok(res.events.some(function (e) { return e.kind === 'win'; }));
});

test('a well directly in front of the ship eats it', function () {
  const res = run(level({}), [{ x: 450, y: 600, charges: 1 }], {});
  assert.equal(res.outcome, 'fail');
  assert.equal(res.reason, 'well');
  const consumed = res.events.find(function (e) { return e.kind === 'consumed' && e.id === 'ship'; });
  assert.ok(consumed, 'consumed event for the ship');
  assert.equal(consumed.other, 'well0');
  assert.ok(res.events.some(function (e) { return e.kind === 'shipDied'; }));
  assert.ok(res.t < 4, 'dies quickly');
});

test('a side well bends the trajectory towards it without capturing the ship', function () {
  const l = level({ target: { x: 10000, y: 10000, r: 10 } }); // unreachable
  const up = run(l, [{ x: 450, y: 450, charges: 1 }], {});
  assert.equal(up.reason, 'lost', 'ship survives the flyby and leaves the field');

  const end = up.trace[up.trace.length - 1];
  assert.ok(end.y < 600, 'well above the path (smaller y) pulls the ship up: ' + end.y);
  assert.ok(end.vy < 0, 'final vy points towards the well');
  const bend = (Math.atan2(-end.vy, end.vx) * 180) / Math.PI;
  assert.ok(bend > 40 && bend < 110, 'big but non-capturing bend, got ' + bend.toFixed(1) + ' deg');

  // Mirror the well below the path: the deflection mirrors exactly.
  const down = run(l, [{ x: 450, y: 750, charges: 1 }], {});
  const dend = down.trace[down.trace.length - 1];
  assert.ok(dend.y > 600 && dend.vy > 0, 'mirrored pull deflects the other way');
  near(dend.vy, -end.vy, 1e-9, 'symmetric deflection');

  // More charges bend it harder. Past 90 degrees |vy| starts shrinking again,
  // so compare the turn angle rather than the y component.
  const strong = run(l, [{ x: 450, y: 450, charges: 3 }], {});
  assert.equal(strong.reason, 'lost', 'a 3-charge well at 150 units is survivable');
  const send = strong.trace[strong.trace.length - 1];
  const bend3 = (Math.atan2(-send.vy, send.vx) * 180) / Math.PI;
  assert.ok(bend3 > bend + 30, 'stacking bends much harder: ' + bend3.toFixed(1) + ' vs ' + bend.toFixed(1));
});

test('leaving the playfield fails with reason lost', function () {
  const l = level({ ship: { x: 100, y: 600, vx: 0, vy: -200 }, target: { x: 800, y: 1100, r: 28 } });
  const res = run(l, [], {});
  assert.equal(res.outcome, 'fail');
  assert.equal(res.reason, 'lost');
  near(res.t, 600 / 200, 0.02, 'lost as soon as it clears the edge heading away');
  assert.ok(res.events.some(function (e) { return e.kind === 'left' && e.id === 'ship'; }));
});

test('a ship that never arrives fails with reason drift', function () {
  const l = level({ ship: { x: 100, y: 600, vx: 0, vy: 0 }, target: { x: 800, y: 200, r: 28 } });

  const short = run(l, [], { maxSeconds: 5 });
  assert.equal(short.outcome, 'fail');
  assert.equal(short.reason, 'drift');
  near(short.t, 5, DT, 'stops at maxSeconds');

  const full = run(l, [], {});
  assert.equal(full.reason, 'drift');
  near(full.t, MAX_FLIGHT_SECONDS, DT, 'default horizon is MAX_FLIGHT_SECONDS');
});

// --- fixtures --------------------------------------------------------------

test('a patrolling asteroid follows its polyline on schedule and loops', function () {
  // Closed circuit 100 -> 340 -> 100 is 480 units long at 60 u/s = 8 s per lap.
  const l = level({
    ship: { x: 100, y: 1100, vx: 0, vy: 0 },
    target: { x: 800, y: 1100, r: 28 },
    fixtures: [{ type: 'asteroid', r: 20, speed: 60, loop: true, path: [{ x: 100, y: 100 }, { x: 340, y: 100 }] }]
  });
  const state = createState(l, []);
  const a = byId(state, 'asteroid0');
  assert.ok(a, 'fixture got the default id type+index');
  assert.equal(a.kinematic, true);
  near(a.x, 100, 1e-9, 'starts at the first path point');
  near(a.y, 100, 1e-9, 'path y');

  // t = 4 is the turn-around instant (exactly at the far point): the reported
  // direction there is still the outbound leg's.
  const expect = [[1, 160, 60], [2, 220, 60], [4, 340, 60], [5, 280, -60], [7, 160, -60], [8, 100, 60]];
  for (const row of expect) {
    advance(state, row[0]);
    near(state.t, row[0], 1e-9, 'sim time');
    near(a.x, row[1], 1e-9, 'asteroid x at t=' + row[0]);
    near(a.y, 100, 1e-9, 'asteroid y at t=' + row[0]);
    near(a.vx, row[2], 1e-9, 'asteroid vx at t=' + row[0]);
    assert.equal(a.pathT, row[0], 'pathT tracks sim time');
  }
  // Kinematic movers ignore the bounds sweep and keep patrolling.
  assert.equal(a.alive, true);
});

test('a drone bounces elastically off a circular and a rectangular obstacle', function () {
  function bounce(obstacle) {
    const l = level({
      ship: { x: 100, y: 100, vx: 0, vy: 0 },
      target: { x: 800, y: 100, r: 28 },
      fixtures: [{ type: 'drone', r: 12, x: 100, y: 600, vx: 100, vy: 0 }, obstacle]
    });
    const state = createState(l, []);
    const d = byId(state, 'drone0');
    advance(state, 4);
    return d;
  }

  const viaCircle = bounce({ type: 'obstacle', shape: 'circle', x: 400, y: 600, r: 40 });
  near(viaCircle.vx, -100, 1e-9, 'head-on circle bounce reverses vx');
  near(viaCircle.vy, 0, 1e-9, 'no y kick on a head-on hit');
  assert.ok(viaCircle.x < 348, 'never crossed into the obstacle: ' + viaCircle.x);
  assert.equal(viaCircle.alive, true);

  // Rect is axis aligned with (x, y) at its top-left corner.
  const viaRect = bounce({ type: 'obstacle', shape: 'rect', x: 400, y: 560, w: 60, h: 80 });
  near(viaRect.vx, -100, 1e-9, 'rect bounce reverses vx');
  near(viaRect.vy, 0, 1e-9, 'no y kick on a flat face');
  assert.ok(viaRect.x < 388, 'stopped at the left face: ' + viaRect.x);

  // A glancing hit on the rect face deflects in y instead.
  const l = level({
    ship: { x: 100, y: 100, vx: 0, vy: 0 },
    target: { x: 800, y: 100, r: 28 },
    fixtures: [
      { type: 'drone', r: 12, x: 400, y: 400, vx: 0, vy: 120 },
      { type: 'obstacle', shape: 'rect', x: 300, y: 600, w: 200, h: 40 }
    ]
  });
  const s2 = createState(l, []);
  advance(s2, 5);
  const d2 = byId(s2, 'drone0');
  near(d2.vy, -120, 1e-9, 'bounced off the top face');
  assert.ok(d2.y < 588, 'sits above the face: ' + d2.y);
});

test('ore is delivered to the receiver and the ship may bounce off it', function () {
  const l = level({
    ship: { x: 100, y: 600, vx: 120, vy: 0 },
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [
      { type: 'ore', id: 'rock', r: 10, x: 100, y: 300, vx: 100, vy: 0 },
      { type: 'oreReceiver', id: 'dock', x: 500, y: 300, r: 50 }
    ]
  });
  const state = createState(l, []);
  advance(state, 5);
  assert.equal(state.oreDelivered, 1);
  assert.equal(state.oreLost, 0);
  const ev = state.events.find(function (e) { return e.kind === 'delivered'; });
  assert.ok(ev, 'delivered event');
  assert.equal(ev.id, 'rock', 'explicit fixture ids are kept');
  assert.equal(ev.other, 'dock');
  near(ev.t, 3.5, 0.02, 'enters the 50-unit zone at x = 450');
  assert.equal(byId(state, 'rock').alive, false);

  // Ore is not lethal: the ship bounces off it instead of dying.
  const l2 = level({
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [{ type: 'ore', id: 'rock', r: 10, x: 400, y: 600, vx: 0, vy: 0 }]
  });
  const s2 = createState(l2, []);
  advance(s2, 4);
  assert.equal(s2.outcome, null, 'still flying');
  const rock2 = byId(s2, 'rock');
  assert.ok(s2.ship.vx < 120, 'ship lost speed in the bounce: ' + s2.ship.vx);
  assert.ok(rock2.vx > 0, 'ore was knocked along');
  // Elastic with masses: momentum is conserved (equal masses here, so the
  // head-on hit swaps their velocities).
  near(s2.ship.vx * s2.ship.mass + rock2.vx * rock2.mass, 120 * s2.ship.mass, 1e-9, 'momentum');
  near(s2.ship.vx, 0, 1e-9, 'ship stops dead');
  near(rock2.vx, 120, 1e-9, 'ore takes the ship speed');
  assert.ok(s2.events.some(function (e) { return e.kind === 'collision' && e.id === 'ship' && e.other === 'rock'; }));
});

test('an immune body passes through a well that would eat an ordinary one', function () {
  function fly(immune) {
    const l = level({
      ship: { x: 100, y: 100, vx: 0, vy: 0 },
      target: { x: 800, y: 100, r: 28 },
      fixtures: [{ type: 'asteroid', id: 'rock', r: 16, x: 100, y: 600, vx: 100, vy: 0, immune: immune }]
    });
    // The asteroid flies straight through a well sitting on its track.
    const state = createState(l, [{ x: 400, y: 600, charges: 1 }]);
    advance(state, 5);
    return state;
  }

  const immune = fly(true);
  const rock = byId(immune, 'rock');
  assert.equal(rock.alive, true, 'immune asteroid survives the well');
  assert.ok(rock.x > 550, 'and keeps going straight through: ' + rock.x);
  near(rock.y, 600, 1e-9, 'inert movers ignore gravity');
  assert.ok(!immune.events.some(function (e) { return e.kind === 'consumed'; }), 'no consumed event');

  const ordinary = fly(false);
  assert.equal(byId(ordinary, 'rock').alive, false, 'an ordinary asteroid is consumed');
  const ev = ordinary.events.find(function (e) { return e.kind === 'consumed'; });
  assert.equal(ev.id, 'rock');
  assert.equal(ev.other, 'well0');

  // An immune fixture is lethal to the ship even though ore normally is not.
  const l = level({
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [{ type: 'ore', id: 'shard', r: 12, x: 400, y: 600, vx: 0, vy: 0, immune: true }]
  });
  const res = run(l, [], {});
  assert.equal(res.outcome, 'fail');
  assert.equal(res.reason, 'immune');
});

test('a hunter accelerates towards the ship and clamps to maxSpeed', function () {
  const l = level({
    ship: { x: 800, y: 600, vx: 0, vy: 0 },
    target: { x: 100, y: 100, r: 10 },
    fixtures: [{ type: 'hunter', id: 'h', r: 14, x: 100, y: 600, vx: 0, vy: 0, accel: 60, maxSpeed: 140 }]
  });
  const state = createState(l, []);
  const h = byId(state, 'h');
  assert.equal(h.responsive, true);

  advance(state, 1);
  assert.ok(h.vx > 0 && h.x > 100, 'closes on the ship');
  near(h.vx, 60, 0.5, 'accel 60 for 1 s');
  near(h.vy, 0, 1e-9, 'straight along the line of sight');

  advance(state, 3);
  near(Math.hypot(h.vx, h.vy), 140, 1e-9, 'speed clamped to maxSpeed');

  const res = run(l, [], {});
  assert.equal(res.outcome, 'fail');
  assert.equal(res.reason, 'hunter', 'the hunter eventually catches a drifting ship');

  // Defaults apply when the fixture omits them.
  const plain = createState(level({ fixtures: [{ type: 'hunter', r: 14, x: 100, y: 600 }] }), []);
  assert.equal(byId(plain, 'hunter0').accel, 60);
  assert.equal(byId(plain, 'hunter0').maxSpeed, 140);
});

// --- planning-side API -----------------------------------------------------

test('validateWells enforces budget, stack limit and bounds', function () {
  const l = level({ charges: 3, stackLimit: 2 });

  assert.deepEqual(validateWells(l, []), { ok: true, reason: null, message: null });
  assert.equal(validateWells(l, [{ x: 100, y: 100, charges: 2 }, { x: 300, y: 400, charges: 1 }]).ok, true);

  assert.equal(validateWells(l, [{ x: 100, y: 100, charges: 2 }, { x: 300, y: 400, charges: 2 }]).reason, 'budget');
  assert.equal(validateWells(l, [{ x: 100, y: 100, charges: 3 }]).reason, 'stack');
  assert.equal(validateWells(l, [{ x: -1, y: 100, charges: 1 }]).reason, 'bounds');
  assert.equal(validateWells(l, [{ x: 100, y: 1201, charges: 1 }]).reason, 'bounds');
  assert.equal(validateWells(l, [{ x: 901, y: 100, charges: 1 }]).reason, 'bounds');
  assert.equal(validateWells(l, [{ x: 100, y: 100, charges: 0 }]).reason, 'charges');
  assert.equal(validateWells(l, [{ x: 100, y: 100, charges: 1.5 }]).reason, 'charges');
  // Corners are inside.
  assert.equal(validateWells(l, [{ x: 0, y: 0, charges: 1 }]).ok, true);
  assert.equal(validateWells(l, [{ x: 900, y: 1200, charges: 1 }]).ok, true);
});

test('validateWells keeps wells apart so they cannot fake a bigger stack', function () {
  const l = level({ charges: 3, stackLimit: 1 });
  assert.equal(MIN_WELL_DISTANCE, 100);

  // Two singles 60 apart would pull like one 2-stack.
  const tooClose = validateWells(l, [{ x: 400, y: 600, charges: 1 }, { x: 460, y: 600, charges: 1 }]);
  assert.equal(tooClose.ok, false);
  assert.equal(tooClose.reason, 'spacing');
  assert.equal(tooClose.message, 'Wells must be at least 100 units apart');

  // Exactly MIN_WELL_DISTANCE apart is allowed, on either axis and diagonally.
  assert.equal(validateWells(l, [{ x: 400, y: 600, charges: 1 }, { x: 500, y: 600, charges: 1 }]).ok, true);
  assert.equal(validateWells(l, [{ x: 400, y: 600, charges: 1 }, { x: 400, y: 500, charges: 1 }]).ok, true);
  assert.equal(validateWells(l, [{ x: 400, y: 600, charges: 1 }, { x: 480, y: 680, charges: 1 }]).ok, true);
  assert.equal(validateWells(l, [{ x: 400, y: 600, charges: 1 }, { x: 470, y: 670, charges: 1 }]).reason, 'spacing');

  // The spacing check runs after the cheaper ones, and a single well is fine.
  assert.equal(validateWells(l, [{ x: 400, y: 600, charges: 1 }]).ok, true);
  assert.equal(validateWells(l, [{ x: 400, y: 600, charges: 2 }, { x: 430, y: 600, charges: 2 }]).reason, 'stack');
});

test('predict samples every 1/20 s and reports the closest approach', function () {
  const l = level({
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [
      { type: 'asteroid', id: 'rock', r: 20, x: 500, y: 720, vx: 0, vy: 0 },
      { type: 'oreReceiver', id: 'dock', x: 200, y: 200, r: 50 }
    ]
  });
  const wells = [{ x: 450, y: 430, charges: 1 }];
  const p = predict(l, wells, 2);

  assert.ok(p.ship.length >= 40, 'a sample every 1/20 s over 2 s');
  near(p.ship[0].t, 0, 1e-12, 'first sample is t = 0');
  near(p.ship[0].x, 100, 1e-12, 'first sample is the start position');
  for (let i = 1; i < p.ship.length; i++) {
    near(p.ship[i].t - p.ship[i - 1].t, PREDICT_SAMPLE_DT, 1e-9, 'sample spacing');
  }
  near(p.ship[p.ship.length - 1].t, 2, 1e-9, 'horizon reached');
  assert.equal(p.outcome, null, 'still flying at the horizon');

  // Movers get their own sampled path under the same timestamps; static
  // fixtures (the receiver) are not sampled.
  assert.ok(p.bodies.rock, 'mover path keyed by id');
  assert.equal(p.bodies.rock.length, p.ship.length);
  near(p.bodies.rock[0].x, 500, 1e-12, 'mover sample position');
  assert.equal(p.bodies.dock, undefined, 'static zones are not sampled');

  assert.ok(p.closestApproach, 'closest approach reported');
  assert.ok(p.closestApproach.id === 'well0' || p.closestApproach.id === 'rock');
  assert.ok(p.closestApproach.dist >= 0);
  assert.ok(p.closestApproach.t >= 0 && p.closestApproach.t <= p.t);

  // Moving the well onto the ship's nose makes the well the nearest hazard
  // and ends the prediction early with the failure the player would see.
  const doomed = predict(l, [{ x: 400, y: 600, charges: 1 }], 30);
  assert.equal(doomed.outcome, 'fail');
  assert.equal(doomed.reason, 'well');
  assert.equal(doomed.closestApproach.id, 'well0');
  assert.equal(doomed.closestApproach.dist, 0);
});

/** Total heading change along a trace, in degrees (unwrapped). */
function totalTurn(trace) {
  let total = 0;
  let prev = null;
  for (let i = 0; i < trace.length; i++) {
    const h = Math.atan2(trace[i].vy, trace[i].vx);
    if (prev !== null) {
      let d = h - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      total += d;
    }
    prev = h;
  }
  return (total * 180) / Math.PI;
}

test('a well has a hard reach with a smooth taper at the rim', function () {
  const wells = [{ x: 0, y: 0, charges: 1 }];
  const mag = function (r) {
    const a = fieldAt(wells, r, 0);
    return Math.hypot(a.ax, a.ay);
  };
  const plain = function (r) {
    const soft = r * r + EPS * EPS;
    return (G * r) / (soft * Math.sqrt(soft));
  };

  // Nothing at all at or beyond the reach.
  assert.deepEqual(fieldAt(wells, 361, 0), { ax: 0, ay: 0 });
  assert.equal(mag(WELL_REACH), 0, 'zero exactly at the rim');
  assert.equal(mag(4000), 0, 'and far outside');
  assert.equal(fieldAt([{ x: 0, y: 0, charges: 3 }], 361, 0).ax, 0, 'stacking does not extend the reach');

  // Full strength everywhere inside the taper.
  const inner = WELL_REACH - WELL_TAPER; // 270
  near(mag(100), plain(100), 1e-12, 'full strength deep inside');
  near(mag(269), plain(269), 1e-12, 'full strength at 269');
  near(mag(inner), plain(inner), 1e-12, 'smoothstep is 1 at the inner edge');

  // Inside the taper: weaker than plain, monotone, faded out by the rim.
  assert.ok(mag(300) > 0 && mag(300) < plain(300), 'tapered at 300');
  assert.ok(mag(359.9) < plain(359.9) * 1e-3, 'essentially gone at the rim');
  for (let r = 260; r < 360; r += 0.5) {
    assert.ok(mag(r) >= mag(r + 0.5), 'monotone through the taper at r = ' + r);
  }
  // No step anywhere across the rim: the field is continuous, so nothing kicks.
  let biggest = 0;
  for (let r = 200; r < 400; r += 0.25) {
    const d = Math.abs(mag(r) - mag(r + 0.25));
    if (d > biggest) biggest = d;
  }
  assert.ok(biggest < 0.5, 'continuous across the rim, biggest step ' + biggest.toFixed(4));
});

test('a slow ship is swung right around a stacked well instead of past it', function () {
  // 3000x3000 box so the loop has room. The ship passes 340 units from the
  // well - just inside WELL_REACH - at 60 u/s, which is far below the escape
  // speed there, so it winds all the way around before it finally gets away.
  const wide = {
    bounds: { w: 3000, h: 3000 },
    charges: 3,
    stackLimit: 3,
    ship: { x: 200, y: 1500 - 340, vx: 60, vy: 0 },
    target: { x: 1e6, y: 1e6, r: 10 },
    fixtures: []
  };
  const well = [{ x: 1000, y: 1500, charges: 3 }];
  const res = run(level(wide), well, {});
  assert.notEqual(res.reason, 'well', 'it never touches the core');
  const turned = totalTurn(res.trace);
  assert.ok(Math.abs(turned) > 300, 'loops right around, turned ' + turned.toFixed(0) + ' deg');

  // The same ship on a tighter line is simply eaten: close passes are fatal.
  const tight = level(Object.assign({}, wide, { ship: { x: 200, y: 1500 - 180, vx: 60, vy: 0 } }));
  assert.equal(run(tight, well, {}).reason, 'well');
});

test('the board edge is soft: a ship just outside can be pulled back in', function () {
  const l = level({
    bounds: { w: 900, h: 1200 },
    charges: 3,
    stackLimit: 3,
    ship: { x: 820, y: 600, vx: 60, vy: 0 }, // drifting off the right-hand edge
    target: { x: 783, y: 307, r: 28 },
    fixtures: []
  });

  const lost = run(l, [], {});
  assert.equal(lost.reason, 'lost', 'without help it just sails off the board');

  const saved = run(l, [{ x: 670, y: 400, charges: 1 }], {});
  assert.equal(saved.outcome, 'win', 'the well reels it back in');
  let maxX = 0;
  let outT = 0;
  for (const sample of saved.trace) {
    if (sample.x > maxX) { maxX = sample.x; outT = sample.t; }
  }
  const stray = maxX - l.bounds.w;
  assert.ok(stray > 40 && stray < 100, 'strayed ' + stray.toFixed(0) + ' units off the board');
  assert.ok(saved.t > outT, 'and only reached the target after coming back');
});

test('willReturn decides whether an off-board body can still come back', function () {
  const l = level({ fixtures: [{ type: 'wormhole', id: 'wh', a: { x: 450, y: 40, angle: 0 }, b: { x: 450, y: 1160, angle: 0 }, r: 26 }] });
  const state = createState(l, [{ x: 700, y: 300, charges: 1 }]);
  const probe = function (x, y, vx, vy, type) {
    return willReturn(state, { type: type || 'ore', x: x, y: y, vx: vx, vy: vy });
  };

  assert.equal(probe(450, 600, 0, -100), true, 'on the board');
  assert.equal(probe(450, 0, 0, -100), true, 'exactly on the edge counts as on the board');
  assert.equal(probe(450, -5, 0, -100), false, 'just outside and heading away');
  assert.equal(probe(450, -5, 0, 100), true, 'just outside but aimed back at the board');
  assert.equal(probe(-500, 600, -100, 0), false, 'far outside heading away');
  assert.equal(probe(-500, 600, 100, 0), true, 'far outside but aimed at the board');
  assert.equal(probe(450, -5, 0, 0), false, 'outside and stopped: no line to follow');

  // Still inside a well's reach, or aimed at one, is never lost.
  assert.equal(probe(700, -50, 0, -100), true, 'inside the reach of the well at (700, 300)');
  assert.equal(probe(1500, 300 - 200, -100, 0), true, 'aimed across the reach disc');
  assert.equal(probe(1500, 300 - 500, -100, 0), false, 'aimed past the reach disc');

  // A wormhole mouth counts: it can post the body back onto the board.
  assert.equal(probe(450, -60, 0.0001, -1), false, 'mouth a is behind it');
  assert.equal(probe(1500, 40, -100, 0), true, 'aimed at wormhole mouth a');

  // Hunters steer, so they are kept until the leash runs out.
  assert.equal(probe(450, -5, 0, -100, 'hunter'), true, 'a hunter just off the board is still chasing');
  assert.equal(probe(450, -HUNTER_LEASH - 10, 0, -100, 'hunter'), false, 'beyond the leash it is gone');
});

test('a ship outside the bounds and pointing away is lost at once', function () {
  const l = level({ ship: { x: 100, y: 600, vx: 0, vy: -200 }, target: { x: 800, y: 1100, r: 28 } });
  const res = run(l, [], {});
  assert.equal(res.reason, 'lost');
  near(res.t, 600 / 200, 0.02, 'lost the moment its centre clears the edge');
  const end = res.trace[res.trace.length - 1];
  assert.ok(end.y < 0 && end.y > -5, 'no margin is granted: ' + end.y.toFixed(2));
});

test('a ship outside the bounds but aimed back at the board keeps flying', function () {
  // Starts off the left-hand edge, still pointing at the board.
  const l = level({ ship: { x: -60, y: 600, vx: 120, vy: 0 }, target: { x: 400, y: 600, r: 28 } });
  const state = createState(l, []);
  advance(state, 0.2);
  assert.equal(state.outcome, null, 'not lost while it is aimed at the board');
  assert.ok(state.ship.x < 0, 'and it really is outside: ' + state.ship.x.toFixed(1));
  assert.equal(willReturn(state, state.ship), true);

  const res = run(l, [], {});
  assert.equal(res.outcome, 'win', 'it flies back in and reaches the target');
  near(res.t, (400 - 28 - SHIP_RADIUS + 60) / 120, 0.02, 'arrival time');

  // Aim the same ship away from the board and it is gone immediately.
  const away = run(level({ ship: { x: -60, y: 600, vx: -120, vy: 0 }, target: { x: 400, y: 600, r: 28 } }), [], {});
  assert.equal(away.reason, 'lost');
  near(away.t, DT, DT, 'lost on the first step');
});

test('a ship aimed at a well reach disc is not lost, and gets bent back in', function () {
  // Flying up the outside of the right-hand edge: the board is not in its path,
  // but the reach disc of the well at (820, 400) is.
  const l = level({
    charges: 3,
    stackLimit: 3,
    ship: { x: 1050, y: 1000, vx: 0, vy: -90 },
    target: { x: 634, y: 413, r: 28 },
    fixtures: []
  });
  const wells = [{ x: 820, y: 400, charges: 2 }];

  const state = createState(l, wells);
  assert.equal(willReturn(state, state.ship), true, 'the ray meets the reach disc');
  assert.ok(Math.hypot(1050 - 820, 1000 - 400) > WELL_REACH, 'but it starts outside the reach');

  const res = run(l, wells, {});
  assert.equal(res.outcome, 'win', 'the well hooks it back over the board');
  assert.ok(res.t > 5, 'after a long way round: t = ' + res.t.toFixed(2));

  // Take the well away and the same ship is written off on the first step.
  const zero = run(l, [], {});
  assert.equal(zero.reason, 'lost');
  near(zero.t, DT, DT, 'nothing in its path at all');
});


// --- wormholes -------------------------------------------------------------

/** Step until an event of `kind` is pushed; returns it (or null). */
function runToEvent(state, kind, seconds) {
  const want = Math.round(seconds / DT);
  while (state.steps < want && !state.outcome) {
    const before = state.events.length;
    step(state);
    for (let i = before; i < state.events.length; i++) {
      if (state.events[i].kind === kind) return state.events[i];
    }
  }
  return null;
}

function teleports(events) {
  return events.filter(function (e) { return e.kind === 'teleport'; });
}

test('a ship entering mouth a leaves mouth b along b.angle at the same speed', function () {
  const l = level({
    target: { x: 10000, y: 10000, r: 10 }, // unreachable: let the flight play out
    fixtures: [{
      type: 'wormhole',
      id: 'wh',
      a: { x: 400, y: 600, angle: Math.PI },
      b: { x: 400, y: 200, angle: -Math.PI / 2 }, // faces up (y grows down)
      r: 26
    }]
  });
  const state = createState(l, []);
  const hole = byId(state, 'wh');
  assert.equal(hole.static, true);
  assert.equal(hole.zone, true);
  assert.equal(hole.lethal, false, 'wormholes are not lethal');
  assert.equal(bodyIsLethal(hole), false);
  assert.equal(hole.r, WORMHOLE_RADIUS);
  assert.deepEqual(state.wormholes, [hole], 'also listed on state.wormholes');

  const ev = runToEvent(state, 'teleport', 5);
  assert.ok(ev, 'teleport event emitted');
  assert.equal(ev.kind, 'teleport');
  assert.equal(ev.id, 'ship');
  assert.equal(ev.wormhole, 'wh');
  assert.equal(ev.from, 'a');
  // Mouth a sits at x = 400 with r = 26, so the ship enters at x = 374.
  near(ev.t, (374 - 100) / 120, 1e-9, 'entry time');

  // Placed just outside mouth b, along b.angle, keeping its speed. The entry
  // heading (+x) is discarded: exits always run along the far mouth's angle.
  near(state.ship.x, 400, 1e-9, 'exit x');
  near(state.ship.y, 200 - (26 + SHIP_RADIUS + 2), 1e-9, 'exit y is r + shipR + 2 outside the mouth');
  near(state.ship.vx, 0, 1e-9, 'exit vx');
  near(state.ship.vy, -120, 1e-9, 'exits along b.angle');
  near(Math.hypot(state.ship.vx, state.ship.vy), 120, 1e-9, 'speed preserved');
  assert.equal(state.outcome, null, 'the jump is not an ending');

  // The ship keeps flying out of mouth b and off the top of the board.
  advance(state, 6);
  assert.equal(state.reason, 'lost');

  // Gravity never reaches through a mouth: fieldAt only knows about wells and
  // plain distance, so a well parked on mouth b pulls on the far-side ship
  // exactly as the softened inverse-square law says.
  const a = fieldAt([{ x: 400, y: 200, charges: 3 }], 400, 400);
  const soft = 200 * 200 + EPS * EPS;
  near(a.ay, (G * 3 * -200) / (soft * Math.sqrt(soft)), 1e-12, 'no shortcut through the hole');
  near(a.ax, 0, 1e-12, 'straight up the y axis');
});

test('a two-way wormhole carries bodies in both directions', function () {
  // Mouth a on the y = 200 lane, mouth b on the y = 900 lane; the ship runs
  // into a and the drone runs into b, so both directions fire in one flight.
  const l = level({
    ship: { x: 100, y: 200, vx: 120, vy: 0 },
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [
      { type: 'drone', id: 'd', r: 12, x: 100, y: 900, vx: 100, vy: 0 },
      { type: 'wormhole', id: 'wh', a: { x: 400, y: 200, angle: 0 }, b: { x: 400, y: 900, angle: 0 }, r: 26 }
    ]
  });
  const state = createState(l, []);
  advance(state, 4);
  const jumps = teleports(state.events);
  assert.equal(jumps.length, 2, 'one jump each');

  assert.equal(jumps[0].id, 'ship');
  assert.equal(jumps[0].from, 'a');
  near(jumps[0].t, (374 - 100) / 120, 1e-9, 'ship entry time');
  near(state.ship.y, 900, 1e-9, 'ship came out of mouth b');

  const drone = byId(state, 'd');
  assert.equal(jumps[1].id, 'd');
  assert.equal(jumps[1].from, 'b', 'the b -> a direction works too');
  near(jumps[1].t, (374 - 100) / 100, DT, 'drone entry time');
  near(drone.y, 200, 1e-9, 'drone came out of mouth a');
  near(drone.x, 400 + 26 + 12 + 2 + 100 * (state.t - jumps[1].t), 1e-9, 'exit point + travel since');
});

test('a one-way wormhole refuses the b -> a direction', function () {
  const l = level({
    ship: { x: 100, y: 200, vx: 120, vy: 0 },
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [
      { type: 'drone', id: 'd', r: 12, x: 100, y: 900, vx: 100, vy: 0 },
      { type: 'wormhole', id: 'wh', oneWay: true, a: { x: 400, y: 200, angle: 0 }, b: { x: 400, y: 900, angle: 0 }, r: 26 }
    ]
  });
  const state = createState(l, []);
  assert.equal(byId(state, 'wh').oneWay, true);
  advance(state, 6);

  const jumps = teleports(state.events);
  assert.equal(jumps.length, 1, 'only the a -> b jump fires');
  assert.equal(jumps[0].id, 'ship');
  assert.equal(jumps[0].from, 'a');

  const drone = byId(state, 'd');
  near(drone.y, 900, 1e-9, 'the drone sailed straight through mouth b');
  near(drone.vx, 100, 1e-9, 'and was never redirected');
  near(drone.x, 100 + 100 * state.t, 1e-9, 'exactly as far as it would have flown anyway');
});

test('the cooldown holds a body that is still sitting in a mouth', function () {
  // Mouth b throws the ship back out 38 units to the left of it, which lands
  // inside mouth a. A slow ship is still inside mouth a when the 0.5 s lockout
  // expires, so it jumps again the instant it is allowed to - and keeps doing
  // so on an exact WORMHOLE_COOLDOWN beat instead of every single step.
  const l = level({
    ship: { x: 100, y: 600, vx: 30, vy: 0 },
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [{
      type: 'wormhole',
      id: 'wh',
      a: { x: 400, y: 600, angle: 0 },
      b: { x: 440, y: 600, angle: Math.PI },
      r: 26
    }]
  });
  const res = run(l, [], {});
  const jumps = teleports(res.events);
  assert.ok(jumps.length > 5, 'it keeps re-entering, got ' + jumps.length);
  near(jumps[0].t, (374 - 100) / 30, 1e-9, 'first entry');
  for (let i = 1; i < jumps.length; i++) {
    assert.equal(jumps[i].from, 'a');
    near(jumps[i].t - jumps[i - 1].t, WORMHOLE_COOLDOWN, 1e-9, 'jump ' + i + ' waits out the cooldown');
  }
  // It just shuttles inside the pair of mouths for the whole flight.
  assert.ok(res.state.ship.x > 380 && res.state.ship.x < 410, 'parked in the mouths: ' + res.state.ship.x);
  assert.equal(res.reason, 'drift', 'the ship never gets anywhere');
});

test('drones jump but kinematic patrol asteroids do not', function () {
  const l = level({
    ship: { x: 100, y: 1100, vx: 0, vy: 0 },
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [
      { type: 'drone', id: 'd', r: 12, x: 100, y: 600, vx: 100, vy: 0 },
      { type: 'asteroid', id: 'rock', r: 20, speed: 100, loop: true, path: [{ x: 100, y: 200 }, { x: 700, y: 200 }] },
      { type: 'wormhole', id: 'whA', a: { x: 400, y: 600, angle: 0 }, b: { x: 400, y: 900, angle: 0 }, r: 26 },
      { type: 'wormhole', id: 'whB', a: { x: 400, y: 200, angle: 0 }, b: { x: 800, y: 200, angle: 0 }, r: 26 }
    ]
  });
  const state = createState(l, []);
  assert.equal(state.wormholes.length, 2, 'both holes listed');
  advance(state, 6);

  const drone = byId(state, 'd');
  const jump = state.events.find(function (e) { return e.kind === 'teleport' && e.id === 'd'; });
  assert.ok(jump, 'the drone went through');
  assert.equal(jump.wormhole, 'whA');
  assert.equal(jump.from, 'a');
  near(jump.t, (374 - 100) / 100, DT, 'drone entry time');
  near(drone.y, 900, 1e-9, 'came out of mouth b');
  assert.ok(drone.x > 438, 'and kept flying along b.angle: ' + drone.x);

  const rock = byId(state, 'rock');
  assert.ok(!state.events.some(function (e) { return e.kind === 'teleport' && e.id === 'rock'; }),
    'a kinematic patrol ignores wormholes');
  near(rock.y, 200, 1e-9, 'still on its polyline');
  near(rock.x, 700, 1e-9, 'and on schedule (600 units in 6 s) despite crossing a mouth');
});

test('prediction keeps sampling across a teleport', function () {
  const l = level({
    target: { x: 10000, y: 10000, r: 10 },
    fixtures: [{
      type: 'wormhole',
      id: 'wh',
      a: { x: 400, y: 600, angle: Math.PI },
      b: { x: 400, y: 200, angle: -Math.PI / 2 },
      r: 26
    }]
  });
  const p = predict(l, [], 3);
  assert.equal(p.outcome, null, 'still alive at the horizon');
  assert.equal(p.ship.length, 61, 'a sample every 1/20 s, t = 0 .. 3');
  near(p.ship[p.ship.length - 1].t, 3, 1e-9, 'samples run to the horizon');
  for (let i = 1; i < p.ship.length; i++) {
    near(p.ship[i].t - p.ship[i - 1].t, PREDICT_SAMPLE_DT, 1e-9, 'sample spacing across the jump');
  }
  // Exactly one sample-to-sample discontinuity: the jump itself.
  let breaks = 0;
  for (let i = 1; i < p.ship.length; i++) {
    const d = Math.hypot(p.ship[i].x - p.ship[i - 1].x, p.ship[i].y - p.ship[i - 1].y);
    if (d > 100) breaks += 1;
  }
  assert.equal(breaks, 1, 'the path teleports once and is continuous otherwise');
  const end = p.ship[p.ship.length - 1];
  near(end.x, 400, 1e-9, 'prediction continues from the far mouth');
  assert.ok(end.y < 200, 'heading up and away: ' + end.y);

  // Wormholes are static, so they are not sampled as movers.
  assert.equal(p.bodies.wh, undefined);
});

// --- phase 2 ingredients ---------------------------------------------------

test('the 47 campaign solutions still fly exactly as they did', async function () {
  // Snapshot taken before the phase-2 additions: the whole point of those
  // additions is that no existing level can notice them.
  const snap = JSON.parse(await readFile(new URL('./campaign-times.json', import.meta.url), 'utf8'));
  const { LEVELS } = await import('../levels.js');
  assert.equal(snap.physicsVersion, PHYSICS_VERSION, 'snapshot is for this physics');
  assert.equal(Object.keys(snap.levels).length, LEVELS.length, 'a snapshot per level');

  for (const l of LEVELS) {
    const want = snap.levels[l.id];
    assert.ok(want, l.id + ' is in the snapshot');
    const res = run(l, l.solution || [], { maxSeconds: 60 });
    assert.equal(res.outcome, want.outcome, l.id + ' outcome');
    assert.equal(res.reason, want.reason, l.id + ' reason');
    near(res.t, want.t, 1e-9, l.id + ' win time');
    assert.equal(res.oreDelivered, want.oreDelivered, l.id + ' ore delivered');
    assert.equal(res.events.length, want.events, l.id + ' event count');
  }
});

test('dead zones and allowed zones gate placement in all three shapes', function () {
  const zones = [
    { type: 'deadZone', id: 'dz-circle', shape: 'circle', x: 200, y: 200, r: 80 },
    { type: 'deadZone', id: 'dz-rect', shape: 'rect', x: 400, y: 100, w: 200, h: 120 },
    { type: 'deadZone', id: 'dz-poly', shape: 'poly', points: [{ x: 100, y: 800 }, { x: 300, y: 800 }, { x: 200, y: 980 }] }
  ];
  const l = level({ charges: 3, stackLimit: 3, fixtures: zones });
  const ok = function (x, y) { return validateWells(l, [{ x: x, y: y, charges: 1 }]); };

  // pointInZone is the shared geometry the editor draws with.
  assert.equal(pointInZone(zones[0], 250, 200), true);
  assert.equal(pointInZone(zones[0], 300, 200), false);
  assert.equal(pointInZone(zones[1], 500, 150), true);
  assert.equal(pointInZone(zones[1], 400, 100), true, 'top-left corner is inside');
  assert.equal(pointInZone(zones[1], 601, 150), false);
  assert.equal(pointInZone(zones[2], 200, 850), true, 'inside the triangle');
  assert.equal(pointInZone(zones[2], 120, 950), false, 'outside the sloped edge');

  assert.equal(ok(250, 200).reason, 'deadzone', 'circle zone');
  assert.equal(ok(500, 150).reason, 'deadzone', 'rect zone');
  assert.equal(ok(200, 850).reason, 'deadzone', 'poly zone');
  assert.equal(ok(700, 600).ok, true, 'clear of every zone');
  assert.equal(ok(250, 200).message, 'No charge can go there');

  // Zones are placement rules only: they never touch the flight.
  const flown = run(level({ fixtures: zones, target: { x: 700, y: 600, r: 28 } }), [], {});
  assert.equal(flown.outcome, 'win', 'the ship sails straight through a dead zone');

  // With allowed zones present, everything outside them is refused.
  const gated = level({
    charges: 3,
    stackLimit: 3,
    fixtures: [
      { type: 'allowedZone', id: 'az', shape: 'rect', x: 300, y: 300, w: 200, h: 200 },
      { type: 'allowedZone', id: 'az2', shape: 'circle', x: 800, y: 900, r: 60 }
    ]
  });
  assert.equal(validateWells(gated, [{ x: 400, y: 400, charges: 1 }]).ok, true, 'inside the first zone');
  assert.equal(validateWells(gated, [{ x: 800, y: 900, charges: 1 }]).ok, true, 'inside the second');
  const refused = validateWells(gated, [{ x: 100, y: 100, charges: 1 }]);
  assert.equal(refused.reason, 'allowed');
  assert.equal(refused.message, 'Charges only go in the marked zones');
});

test('waypoints must be collected in order before the target counts', function () {
  // The ship flies straight along y = 600 through two rings and into the
  // target; a third ring off the path is never touched.
  const rings = [
    { type: 'waypoint', id: 'wp2', x: 500, y: 600, r: 34, order: 2 },
    { type: 'waypoint', id: 'wp1', x: 300, y: 600, r: 34, order: 1 }
  ];
  const l = level({ fixtures: rings, target: { x: 700, y: 600, r: 28 } });

  const state = createState(l, []);
  assert.deepEqual(state.waypoints.map(function (w) { return w.id; }), ['wp1', 'wp2'], 'sorted by order');
  assert.equal(state.waypointsPassed, 0);
  assert.equal(state.nextWaypoint.id, 'wp1');
  assert.equal(state.nextWaypoint.r, 34);

  const res = run(l, [], {});
  assert.equal(res.outcome, 'win');
  const passes = res.events.filter(function (e) { return e.kind === 'waypoint'; });
  assert.deepEqual(passes.map(function (e) { return e.id; }), ['wp1', 'wp2'], 'both, in order');
  assert.equal(passes[0].order, 1);
  near(passes[0].t, (300 - 34 - SHIP_RADIUS - 100) / 120, 0.02, 'first ring at x = 256');
  assert.ok(passes[1].t < res.t, 'and the win comes last');
  assert.equal(res.state.waypointsPassed, 2);
  assert.equal(res.state.nextWaypoint, null);
  assert.equal(res.state.waypoints[0].passed, true);

  // Default radius when the fixture leaves it out.
  assert.equal(createState(level({ fixtures: [{ type: 'waypoint', id: 'w', x: 1, y: 1, order: 1 }] }), []).waypoints[0].r, WAYPOINT_RADIUS);

  // A ring the ship never reaches keeps the target inert: it flies straight
  // through the target circle and is eventually lost instead of winning.
  const unreachable = level({
    fixtures: [{ type: 'waypoint', id: 'wp', x: 450, y: 100, r: 34, order: 1 }],
    target: { x: 700, y: 600, r: 28 }
  });
  const denied = run(unreachable, [], {});
  assert.equal(denied.outcome, 'fail');
  assert.equal(denied.reason, 'lost', 'the target does nothing until the ring is passed');

  // Reaching ring 2 before ring 1 does not count and is not fatal.
  const outOfOrder = level({
    ship: { x: 100, y: 600, vx: 120, vy: 0 },
    fixtures: [
      { type: 'waypoint', id: 'first', x: 300, y: 1000, r: 34, order: 1 },
      { type: 'waypoint', id: 'second', x: 400, y: 600, r: 34, order: 2 }
    ],
    target: { x: 700, y: 600, r: 28 }
  });
  const skipped = run(outOfOrder, [], {});
  assert.equal(skipped.outcome, 'fail', 'flying through ring 2 first wins nothing');
  assert.equal(skipped.state.waypointsPassed, 0);
  assert.equal(skipped.state.nextWaypoint.id, 'first');
  assert.ok(!skipped.events.some(function (e) { return e.kind === 'waypoint'; }), 'no credit');
});

test('a designer-placed well pulls, kills and blocks placement like a real one', function () {
  const fixed = { type: 'well', id: 'lock', x: 450, y: 450, charges: 1 };
  const l = level({ fixtures: [fixed], target: { x: 10000, y: 10000, r: 10 } });

  const state = createState(l, []);
  assert.equal(state.wells.length, 0, 'not one of the player’s wells');
  assert.equal(state.fixedWells.length, 1);
  assert.equal(state.fixedWells[0].id, 'lock');
  assert.equal(state.fixedWells[0].r, killRadius(1), 'it has a lethal core');
  assert.deepEqual(state.sources, state.fixedWells, 'and it is a gravity source');
  assert.ok(!state.bodies.some(function (b) { return b.type === 'well'; }), 'never a body');

  // Same bend as the player placing that well by hand.
  const byDesigner = run(l, [], {});
  const byPlayer = run(level({ target: { x: 10000, y: 10000, r: 10 } }), [{ x: 450, y: 450, charges: 1 }], {});
  near(byDesigner.t, byPlayer.t, 1e-9, 'identical flight');
  near(byDesigner.trace[byDesigner.trace.length - 1].vy, byPlayer.trace[byPlayer.trace.length - 1].vy, 1e-9);
  near(fieldAtState(state, 100, 600).ax, fieldAt([{ x: 450, y: 450, charges: 1 }], 100, 600).ax, 1e-12);

  // It eats the ship and other bodies just like a player well.
  const head = run(level({ fixtures: [{ type: 'well', id: 'lock', x: 450, y: 600, charges: 1 }] }), [], {});
  assert.equal(head.reason, 'well');
  assert.equal(head.events[0].other, 'lock');

  // ... and the player's wells have to keep their distance from it.
  const pl = level({ charges: 3, stackLimit: 3, fixtures: [fixed] });
  assert.equal(validateWells(pl, [{ x: 450, y: 520, charges: 1 }]).reason, 'spacing');
  assert.equal(validateWells(pl, [{ x: 450, y: 560, charges: 1 }]).ok, true, '110 units away is fine');
  // It costs nothing from the budget.
  assert.equal(validateWells(pl, [{ x: 200, y: 200, charges: 3 }]).ok, true);
});

test('a repulsor pushes, has no core and still blocks placement', function () {
  const push = { type: 'repulsor', id: 'push', x: 450, y: 450, charges: 1 };
  const l = level({ fixtures: [push], target: { x: 10000, y: 10000, r: 10 } });

  const state = createState(l, []);
  assert.equal(state.repulsors.length, 1);
  assert.equal(state.repulsors[0].charges, -1, 'a sign-flipped source');
  assert.equal(state.repulsors[0].r, 0, 'no lethal core');
  assert.ok(!state.bodies.some(function (b) { return b.type === 'repulsor'; }));

  // Exactly the opposite field of the same well, taper and all.
  const a = fieldAtState(state, 100, 600);
  const b = fieldAt([{ x: 450, y: 450, charges: 1 }], 100, 600);
  near(a.ax, -b.ax, 1e-12, 'pushed the other way in x');
  near(a.ay, -b.ay, 1e-12, 'and in y');
  near(fieldAtState(state, 450, 450 - WELL_REACH - 1).ay, 0, 1e-12, 'same reach cutoff');

  const res = run(l, [], {});
  assert.equal(res.reason, 'lost', 'nothing to crash into');
  const end = res.trace[res.trace.length - 1];
  assert.ok(end.y > 600 && end.vy > 0, 'shoved away from the repulsor, not towards it');

  // Aimed straight at the centre: it is not lethal and not consumed, it just
  // cannot get there.
  const headOn = run(level({ fixtures: [{ type: 'repulsor', id: 'push', x: 450, y: 600, charges: 3 }], target: { x: 10000, y: 10000, r: 10 } }), [], {});
  assert.notEqual(headOn.reason, 'well', 'a repulsor never eats anything');
  assert.ok(!headOn.events.some(function (e) { return e.kind === 'consumed'; }));
  const back = headOn.trace[headOn.trace.length - 1];
  assert.ok(back.vx < 0, 'bounced straight back down the way it came: vx = ' + back.vx.toFixed(1));

  const pl = level({ charges: 3, stackLimit: 3, fixtures: [push] });
  assert.equal(validateWells(pl, [{ x: 500, y: 480, charges: 1 }]).reason, 'spacing');
  assert.equal(validateWells(pl, [{ x: 450, y: 560, charges: 1 }]).ok, true);
});

test('a patrolling target is hit where it actually is, and is predicted', function () {
  // The target runs down the x = 700 line at 60 u/s while the ship crosses to
  // meet it; they arrive together at about t = 4.7.
  const patrol = { x: 700, y: 300, r: 28, path: [{ x: 700, y: 300 }, { x: 700, y: 900 }], speed: 60, loop: true };
  const l = level({ ship: { x: 100, y: 600, vx: 120, vy: 0 }, target: patrol });

  // Watch the patrol itself with the ship parked out of the way.
  const watch = createState(level({ ship: { x: 100, y: 1100, vx: 0, vy: 0 }, target: patrol }), []);
  assert.equal(watch.target.moving, true);
  near(watch.target.x, 700, 1e-9, 'starts at the first path point');
  near(watch.target.y, 300, 1e-9);
  advance(watch, 1);
  near(watch.target.y, 360, 1e-9, 'moves at 60 u/s along its path');
  advance(watch, 11);
  near(watch.target.y, 900 - 60, 1e-9, 'and turns around at the far end');
  assert.equal(watch.target.pathT, 11, 'position is a pure function of sim time');

  const res = run(l, [], {});
  assert.equal(res.outcome, 'win', 'caught on the way past');
  near(res.t, 4.72, 0.1, 'at the meeting point, not at the start of the path');
  const still = run(level({ ship: { x: 100, y: 600, vx: 120, vy: 0 }, target: { x: 700, y: 300, r: 28 } }), [], {});
  assert.equal(still.reason, 'lost', 'the same flight misses a target parked at the start of the path');

  const p = predict(l, [], 3);
  assert.ok(Array.isArray(p.target), 'target samples returned');
  assert.equal(p.target.length, p.ship.length, 'one per ship sample');
  near(p.target[0].y, 300, 1e-9);
  near(p.target[p.target.length - 1].t, 3, 1e-9);
  near(p.target[p.target.length - 1].y, 300 + 180, 1e-9, 'sampled along the patrol');
  assert.equal(predict(level({}), [], 1).target, null, 'null for a target that never moves');
});
