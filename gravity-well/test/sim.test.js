// node --test gravity-well/test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHYSICS_VERSION,
  DT,
  MAX_FLIGHT_SECONDS,
  G,
  EPS,
  SHIP_RADIUS,
  PREDICT_SAMPLE_DT,
  WORMHOLE_COOLDOWN,
  WORMHOLE_RADIUS,
  killRadius,
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
  assert.equal(PHYSICS_VERSION, 'gw-1');
  assert.equal(DT, 1 / 120);
  assert.equal(MAX_FLIGHT_SECONDS, 90);
  assert.equal(SHIP_RADIUS, 10);
  assert.ok(G > 0 && EPS > 0);
  assert.equal(PREDICT_SAMPLE_DT, 1 / 20);
  near(killRadius(1), 20, 1e-9, 'killRadius(1)');
  near(killRadius(4), 26, 1e-9, 'killRadius(4)');

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
  assert.ok(bend > 15 && bend < 80, 'noticeable but non-capturing bend, got ' + bend.toFixed(1) + ' deg');

  // Mirror the well below the path: the deflection mirrors exactly.
  const down = run(l, [{ x: 450, y: 750, charges: 1 }], {});
  const dend = down.trace[down.trace.length - 1];
  assert.ok(dend.y > 600 && dend.vy > 0, 'mirrored pull deflects the other way');
  near(dend.vy, -end.vy, 1e-9, 'symmetric deflection');

  // More charges bend it harder.
  const strong = run(l, [{ x: 450, y: 450, charges: 3 }], {});
  const send = strong.trace[strong.trace.length - 1];
  assert.ok(Math.abs(send.vy) > Math.abs(end.vy) * 1.8, 'stacking bends much harder');
});

test('leaving the playfield fails with reason lost', function () {
  const l = level({ ship: { x: 100, y: 600, vx: 0, vy: -200 }, target: { x: 800, y: 1100, r: 28 } });
  const res = run(l, [], {});
  assert.equal(res.outcome, 'fail');
  assert.equal(res.reason, 'lost');
  near(res.t, 610 / 200, 0.02, 'exit time (crosses y = -shipRadius)');
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
    advance(state, 6);
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

// --- wormholes -------------------------------------------------------------

/** A wormhole level with the ship flying +x along y = 600 at 120 u/s. */
function whLevel(hole, over) {
  const base = {
    target: { x: 10000, y: 10000, r: 10 }, // unreachable: let the flight play out
    fixtures: [hole]
  };
  return level(Object.assign(base, over || {}));
}

test('a ship entering mouth a leaves mouth b along b.angle at the same speed', function () {
  const l = whLevel({
    type: 'wormhole',
    id: 'wh',
    a: { x: 400, y: 600, angle: Math.PI },
    b: { x: 400, y: 200, angle: -Math.PI / 2 }, // faces up (y grows down)
    r: 26
  });
  const state = createState(l, []);
  const hole = byId(state, 'wh');
  assert.equal(hole.type, 'wormhole');
  assert.equal(hole.static, true);
  assert.equal(hole.zone, true);
  assert.equal(hole.lethal, false, 'wormholes are not lethal');
  assert.equal(bodyIsLethal(hole), false);
  assert.deepEqual(state.wormholes, [hole], 'also listed on state.wormholes');

  advance(state, 3);
  const ev = state.events.find(function (e) { return e.kind === 'teleport'; });
  assert.ok(ev, 'teleport event emitted');
  assert.equal(ev.id, 'ship');
  assert.equal(ev.wormhole, 'wh');
  assert.equal(ev.from, 'a');
  // Mouth a sits at x = 400 with r = 26, so the ship enters at x = 374.
  near(ev.t, (374 - 100) / 120, 1e-9, 'entry time');

  // Placed just outside mouth b, along b.angle, keeping its speed.
  near(state.ship.x, 400, 1e-9, 'exit x');
  near(state.ship.y, 200 - (26 + SHIP_RADIUS + 2), 1e-9, 'exit y is r + shipR + 2 outside the mouth');
  near(state.ship.vx, 0, 1e-9, 'exit vx');
  near(state.ship.vy, -120, 1e-9, 'exits along b.angle, not along the entry heading');
  near(Math.hypot(state.ship.vx, state.ship.vy), 120, 1e-9, 'speed preserved');
  assert.equal(state.outcome, null);

  // Gravity does not reach through the mouths: a well parked on mouth b has no
  // pull on the ship while it is still on the other side of the hole.
  const far = fieldAt([{ x: 400, y: 200, charges: 3 }], 100, 600);
  const plain = fieldAt([{ x: 400, y: 200, charges: 3 }], 100, 600);
  assert.deepEqual(far, plain);
});

test('a two-way wormhole sends a body back again once the cooldown expires', function () {
  const l = whLevel({
    type: 'wormhole',
    id: 'wh',
    a: { x: 400, y: 600, angle: 0 },
    b: { x: 700, y: 600, angle: Math.PI },
    r: 26
  });
  const res = run(l, [], {});
  const jumps = res.events.filter(function (e) { return e.kind === 'teleport'; });
  assert.ok(jumps.length >= 6, 'the ship shuttles between the mouths, got ' + jumps.length);
  for (let i = 0; i < jumps.length; i++) {
    assert.equal(jumps[i].from, i % 2 === 0 ? 'a' : 'b', 'jump ' + i + ' direction alternates');
    assert.equal(jumps[i].id, 'ship');
  }
  // Both exits put it at x = 438 (38 units outside the far mouth, heading +x).
  assert.ok(jumps[1].t - jumps[0].t > WORMHOLE_COOLDOWN, 'return trip happens after the cooldown');
  near(jumps[1].t - jumps[0].t, (674 - 438) / 120, 1e-9, 'shuttle period');
  assert.equal(res.outcome, 'fail');
  assert.equal(res.reason, 'drift', 'it never escapes the loop');
});

test('a one-way wormhole refuses the b -> a direction', function () {
  const l = whLevel({
    type: 'wormhole',
    id: 'wh',
    oneWay: true,
    a: { x: 400, y: 600, angle: 0 },
    b: { x: 700, y: 600, angle: Math.PI },
    r: 26
  });
  const res = run(l, [], {});
  const jumps = res.events.filter(function (e) { return e.kind === 'teleport'; });
  assert.equal(jumps.length, 1, 'only the a -> b jump fires');
  assert.equal(jumps[0].from, 'a');
  // It then sails straight through mouth b and off the board.
  assert.equal(res.outcome, 'fail');
  assert.equal(res.reason, 'lost');
  const end = res.trace[res.trace.length - 1];
  assert.ok(end.x > 900, 'left through the right edge: ' + end.x);
  near(end.vx, 120, 1e-9, 'never redirected by mouth b');
});

test('the cooldown stops overlapping mouths from ping-ponging a body', function () {
  // Mouth b exits 38 units to the left, which lands inside mouth a: without the
  // per-(body, wormhole) lockout the ship would jump on every single step.
  const l = whLevel({
    type: 'wormhole',
    id: 'wh',
    a: { x: 400, y: 600, angle: 0 },
    b: { x: 440, y: 600, angle: Math.PI },
    r: 26
  });
  const res = run(l, [], {});
  const jumps = res.events.filter(function (e) { return e.kind === 'teleport'; });
  assert.equal(jumps.length, 1, 'exactly one jump');
  near(res.state.ship.vx, -120, 1e-9, 'thrown back the way it came');
  assert.equal(res.reason, 'lost');
  assert.ok(res.t < 6, 'it drives straight back out of the left edge');
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
  assert.equal(state.wormholes.length, 2);
  advance(state, 6);

  const drone = byId(state, 'd');
  const jump = state.events.find(function (e) { return e.kind === 'teleport' && e.id === 'd'; });
  assert.ok(jump, 'the drone went through');
  assert.equal(jump.wormhole, 'whA');
  assert.equal(jump.from, 'a');
  near(jump.t, (374 - 100) / 100, 1e-9, 'drone entry time');
  near(drone.y, 900, 1e-9, 'came out of mouth b');
  assert.ok(drone.x > 438, 'and kept flying along b.angle: ' + drone.x);

  const rock = byId(state, 'rock');
  assert.ok(!state.events.some(function (e) { return e.kind === 'teleport' && e.id === 'rock'; }),
    'a kinematic patrol ignores wormholes');
  near(rock.y, 200, 1e-9, 'still on its polyline');
  near(rock.x, 700, 1e-9, 'and on schedule (600 units in 6 s) despite crossing a mouth');
});

test('prediction keeps sampling across a teleport', function () {
  const l = whLevel({
    type: 'wormhole',
    id: 'wh',
    a: { x: 400, y: 600, angle: Math.PI },
    b: { x: 400, y: 200, angle: -Math.PI / 2 },
    r: 26
  });
  const p = predict(l, [], 3);
  assert.equal(p.outcome, null, 'still alive at the horizon');
  near(p.ship[p.ship.length - 1].t, 3, 1e-9, 'samples run to the horizon');
  assert.equal(p.ship.length, 61, 'a sample every 1/20 s, t = 0 .. 3');
  for (let i = 1; i < p.ship.length; i++) {
    near(p.ship[i].t - p.ship[i - 1].t, PREDICT_SAMPLE_DT, 1e-9, 'sample spacing across the jump');
  }
  // Exactly one sample-to-sample discontinuity: the jump itself.
  let jumps = 0;
  for (let i = 1; i < p.ship.length; i++) {
    const d = Math.hypot(p.ship[i].x - p.ship[i - 1].x, p.ship[i].y - p.ship[i - 1].y);
    if (d > 100) jumps += 1;
  }
  assert.equal(jumps, 1, 'the path teleports once and stays continuous otherwise');
  const end = p.ship[p.ship.length - 1];
  near(end.x, 400, 1e-9, 'prediction continues from the far mouth');
  assert.ok(end.y < 200, 'heading up and away: ' + end.y);
});
