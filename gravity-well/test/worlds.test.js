// Gravity Well — campaign structure.
//
// The shape of the campaign is itself a design rule (SPEC.md "Level design
// philosophy"): one new idea per world, three required levels in the rhythm
// introduce / develop / combine plus one optional challenge, and a fixture
// type never appears before the world that owns it.

import test from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS, WORLDS } from '../levels.js';

// The world that owns each fixture type; it may not appear before that world.
const FIXTURE_WORLD = {
  obstacle: 4,
  asteroid: 5,
  drone: 6,
  hunter: 9,
  ore: 10,
  oreReceiver: 10,
  wormhole: 11
};

function levelsOf(phase) {
  return LEVELS.filter((l) => l.phase === phase);
}

test('twelve worlds, each with a title and a blurb', () => {
  assert.equal(WORLDS.length, 12);
  WORLDS.forEach((w, i) => {
    assert.equal(w.phase, i + 1);
    assert.equal(typeof w.title, 'string');
    assert.ok(w.title.length > 0);
    assert.equal(typeof w.blurb, 'string');
    assert.ok(w.blurb.length > 0);
  });
});

test('every level belongs to a declared world', () => {
  const phases = new Set(WORLDS.map((w) => w.phase));
  for (const level of LEVELS) assert.ok(phases.has(level.phase), level.id + ' has no world');
});

test('W1-W11: three required levels then one optional challenge', () => {
  for (let phase = 1; phase <= 11; phase++) {
    const ls = levelsOf(phase);
    assert.equal(ls.length, 4, 'world ' + phase + ' has 4 levels');
    const required = ls.filter((l) => !l.optional);
    const optional = ls.filter((l) => l.optional);
    assert.equal(required.length, 3, 'world ' + phase + ' has 3 required levels');
    assert.equal(optional.length, 1, 'world ' + phase + ' has 1 optional level');
    // introduce / develop / combine / challenge, in that order
    assert.deepEqual(
      ls.map((l) => l.optional),
      [false, false, false, true],
      'world ' + phase + ' order is introduce/develop/combine/challenge'
    );
    ls.forEach((l, i) => {
      assert.equal(l.id, 'w' + phase + '-' + (i + 1), 'world ' + phase + ' ids are sequential');
    });
  }
});

test('W12 is an optional-only expert gauntlet of three levels', () => {
  const ls = levelsOf(12);
  assert.equal(ls.length, 3);
  for (const l of ls) assert.equal(l.optional, true, l.id + ' must be optional');
});

test('the campaign is 47 levels', () => {
  assert.equal(LEVELS.length, 47);
});

test('a fixture type never appears before its world', () => {
  for (const level of LEVELS) {
    for (const fx of level.fixtures) {
      const owner = FIXTURE_WORLD[fx.type];
      assert.ok(owner != null, level.id + ' uses unowned fixture type ' + fx.type);
      assert.ok(
        level.phase >= owner,
        level.id + ' (world ' + level.phase + ') uses ' + fx.type + ', owned by world ' + owner
      );
    }
  }
});

test('each world that owns a fixture actually introduces it in its first level', () => {
  const owners = {};
  for (const [type, world] of Object.entries(FIXTURE_WORLD)) {
    (owners[world] = owners[world] || []).push(type);
  }
  for (const [world, types] of Object.entries(owners)) {
    const first = levelsOf(Number(world))[0];
    assert.ok(first, 'world ' + world + ' has levels');
    const used = new Set(first.fixtures.map((f) => f.type));
    assert.ok(
      types.some((t) => used.has(t)),
      'world ' + world + ' introduce level uses one of ' + types.join('/')
    );
  }
});

test('previewSeconds shortens as the campaign goes on', () => {
  const expected = { 1: 30, 2: 30, 3: 8, 4: 6, 5: 5, 6: 5, 7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4 };
  for (const level of LEVELS) {
    assert.equal(
      level.previewSeconds,
      expected[level.phase],
      level.id + ' previewSeconds should be ' + expected[level.phase]
    );
  }
});

test('w1-1 carries the tutorial hint', () => {
  const first = LEVELS[0];
  assert.equal(first.id, 'w1-1');
  assert.ok(first.hint && first.hint.well, 'w1-1 needs hint.well for the pulsing marker');
  assert.equal(first.hint.well.charges, 1);
  assert.ok(first.radio.some((r) => r.when === 'start'), 'w1-1 opens with a radio line');
});

test('radio lines stay sparse and sit on introduce levels', () => {
  for (const level of LEVELS) {
    const starts = level.radio.filter((r) => r.when === 'start');
    assert.ok(starts.length <= 1, level.id + ' has at most one start line');
    const index = Number(level.id.split('-')[1]);
    if (starts.length) {
      assert.equal(index, 1, level.id + ' start radio only on the introduce level of a world');
    }
    if (level.radio.some((r) => r.when === 'fail')) {
      assert.equal(index, 1, level.id + ' fail nudges belong on the introduce level of a world');
    }
  }
});
