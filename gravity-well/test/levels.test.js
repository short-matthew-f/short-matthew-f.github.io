// Gravity Well — level suite.
//
// Every campaign level has to satisfy four things:
//   (a) it is well-formed (required fields, unique id, known fixture types,
//       a solution that validateWells() accepts);
//   (b) its authored `solution` wins;
//   (c) zero wells FAILS — otherwise it is not a puzzle;
//   (d) each authored well has a tolerance disc at least as large as the
//       phase floor, so the level is never a pixel hunt.
//
// The tolerance function is imported from tools/hotzone.js so the dev tool and
// this test can never disagree about what they measure.

import test from 'node:test';
import assert from 'node:assert/strict';

import { run, validateWells } from '../sim.js';
import { LEVELS, WORLDS } from '../levels.js';
import { toleranceRadius, floorFor, PHASE_FLOOR } from '../tools/hotzone.js';

const MAX_SECONDS = 60;

const KNOWN_FIXTURES = {
  obstacle: 1, asteroid: 1, drone: 1, hunter: 1, ore: 1, oreReceiver: 1, wormhole: 1
};

const RADIO_WHEN = { start: 1, firstWell: 1, launch: 1, win: 1, fail: 1 };

function isNum(v) {
  return typeof v === 'number' && isFinite(v);
}

test('PHASE_FLOOR covers every world', () => {
  for (const w of WORLDS) {
    assert.ok(isNum(PHASE_FLOOR[w.phase]), 'phase ' + w.phase + ' has a floor');
  }
});

test('level ids are unique and in campaign order', () => {
  const seen = new Set();
  let lastPhase = 0;
  for (const level of LEVELS) {
    assert.ok(!seen.has(level.id), 'duplicate id ' + level.id);
    seen.add(level.id);
    assert.match(level.id, /^w(\d+)-(\d+)$/, 'id scheme for ' + level.id);
    const world = Number(level.id.slice(1).split('-')[0]);
    assert.equal(world, level.phase, level.id + ' id world matches phase');
    assert.ok(level.phase >= lastPhase, 'levels are grouped by world (' + level.id + ')');
    lastPhase = level.phase;
  }
});

for (const level of LEVELS) {
  test(level.id + ' — format', () => {
    assert.equal(typeof level.name, 'string');
    assert.ok(level.name.length > 0);
    assert.ok(isNum(level.phase) && level.phase >= 1);
    assert.equal(typeof level.optional, 'boolean');
    assert.ok(isNum(level.bounds.w) && isNum(level.bounds.h));
    assert.ok(isNum(level.charges) && level.charges >= 1);
    assert.ok(isNum(level.stackLimit) && level.stackLimit >= 1);
    assert.ok(level.stackLimit <= level.charges, level.id + ' stackLimit fits the budget');
    assert.ok(isNum(level.previewSeconds) && level.previewSeconds >= 0);
    assert.equal(typeof level.showBodyPreview, 'boolean');

    assert.ok(isNum(level.ship.x) && isNum(level.ship.y));
    assert.ok(isNum(level.ship.vx) && isNum(level.ship.vy));
    const speed = Math.hypot(level.ship.vx, level.ship.vy);
    assert.ok(speed >= 55 && speed <= 205, level.id + ' ship speed ' + speed.toFixed(0) + ' in 60..200');
    assert.ok(level.ship.x >= 0 && level.ship.x <= level.bounds.w);
    assert.ok(level.ship.y >= 0 && level.ship.y <= level.bounds.h);

    assert.ok(isNum(level.target.x) && isNum(level.target.y) && isNum(level.target.r));
    assert.equal(level.target.r, 28, level.id + ' target radius');

    assert.ok(Array.isArray(level.fixtures));
    const ids = new Set();
    for (const fx of level.fixtures) {
      assert.ok(KNOWN_FIXTURES[fx.type], level.id + ' unknown fixture type ' + fx.type);
      assert.equal(typeof fx.id, 'string', level.id + ' fixture needs a string id');
      assert.ok(fx.id.length > 0 && fx.id.length <= 8, level.id + ' fixture id "' + fx.id + '" is short');
      assert.ok(!ids.has(fx.id), level.id + ' duplicate fixture id ' + fx.id);
      ids.add(fx.id);
    }

    assert.ok(Array.isArray(level.radio));
    for (const line of level.radio) {
      assert.ok(RADIO_WHEN[line.when], level.id + ' radio when=' + line.when);
      assert.equal(typeof line.text, 'string');
      assert.ok(line.text.length > 0 && line.text.length <= 200, level.id + ' radio line is terse');
    }

    if (level.hint) {
      assert.ok(isNum(level.hint.well.x) && isNum(level.hint.well.y));
      assert.ok(isNum(level.hint.well.charges));
    }

    if (level.minTolerance != null) {
      assert.ok(level.minTolerance >= 20, level.id + ' minTolerance never below 20');
    }

    assert.ok(Array.isArray(level.solution) && level.solution.length >= 1);
    const v = validateWells(level, level.solution);
    assert.ok(v.ok, level.id + ' solution is legal: ' + v.message);
  });

  test(level.id + ' — solution wins, empty board fails', () => {
    const solved = run(level, level.solution, { maxSeconds: MAX_SECONDS });
    assert.equal(solved.outcome, 'win', level.id + ' solution ended ' + solved.outcome + '/' + solved.reason);

    const bare = run(level, [], { maxSeconds: MAX_SECONDS });
    assert.equal(bare.outcome, 'fail', level.id + ' is winnable with no wells at all');
  });

  test(level.id + ' — every authored well has room to be wrong', () => {
    const floor = floorFor(level);
    for (let i = 0; i < level.solution.length; i++) {
      const tol = toleranceRadius(level, level.solution, i, { step: 8, window: 150 });
      assert.ok(
        tol >= floor,
        level.id + ' well ' + i + ' tolerance ' + tol + ' < floor ' + floor
      );
    }
  });
}
