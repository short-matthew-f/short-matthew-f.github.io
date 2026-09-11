// Not a test: a tiny harness for eyeballing how hard a single well bends the
// ship, so the G / EPS constants in sim.js can be tuned against the feel the
// spec asks for:
//   1 charge  at ~150 units -> gentle bend, ship escapes
//   3 charges at ~100 units -> strong bend / capture risk
//
// Run:  node gravity-well/test/tune.js
import { run, predict, G, EPS, DT, killRadius, SHIP_RADIUS, WELL_REACH, WELL_TAPER, PHYSICS_VERSION } from '../sim.js';

const SPEED = 120;

// Ship flies +x along y = 600 from x = 100. The well sits at x = 450, offset
// `b` units above the line, so `b` is the impact parameter.
function probe(b, charges) {
  const level = {
    id: 'tune',
    bounds: { w: 2000, h: 1200 },
    charges: 3,
    stackLimit: 3,
    ship: { x: 100, y: 600, vx: SPEED, vy: 0 },
    target: { x: 1e6, y: 1e6, r: 1 },
    fixtures: []
  };
  const wells = [{ x: 450, y: 600 - b, charges: charges }];
  const res = run(level, wells, { maxSeconds: 25 });
  const pre = predict(level, wells, 25);
  const last = res.trace[res.trace.length - 1];
  const speed = Math.hypot(last.vx, last.vy);
  const deg = (Math.atan2(last.vy, last.vx) * 180) / Math.PI;
  return {
    b: b,
    n: charges,
    // negative y is "towards the well" (y grows down), so flip the sign for a
    // readable "bent toward the well by N degrees".
    bend: -deg,
    speed: speed,
    miss: pre.closestApproach ? pre.closestApproach.dist : NaN,
    outcome: res.outcome + (res.reason ? '/' + res.reason : ''),
    t: res.t
  };
}

// Node's test runner sweeps up every .js file under test/, so stay quiet when
// it does; this file only has something to say when it is run on purpose.
if (process.env.NODE_TEST_CONTEXT) process.exit(0);

const rows = [];
for (const n of [1, 2, 3]) {
  for (const b of [60, 80, 100, 150, 200, 300]) rows.push(probe(b, n));
}

console.log(PHYSICS_VERSION + ': G = ' + G + '  EPS = ' + EPS + '  reach = ' + WELL_REACH + '  taper = ' + WELL_TAPER + '  DT = ' + DT + '  shipSpeed = ' + SPEED);
console.log('killRadius: 1ch=' + killRadius(1).toFixed(1) + ' 2ch=' + killRadius(2).toFixed(1) + ' 3ch=' + killRadius(3).toFixed(1) + '  shipR=' + SHIP_RADIUS);
console.log('');
console.log(' charges  impact  bend(deg)  exitSpeed   coreGap  outcome');
for (const r of rows) {
  console.log(
    String(r.n).padStart(6) +
      String(r.b).padStart(9) +
      r.bend.toFixed(1).padStart(11) +
      r.speed.toFixed(1).padStart(11) +
      r.miss.toFixed(1).padStart(10) +
      '  ' + r.outcome + ' @ t=' + r.t.toFixed(2)
  );
}
