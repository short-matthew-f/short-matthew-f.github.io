// Gravity Well — test/packs.test.js
// The built-in campaign pack and the pack validator. Pure node, no deps:
//   node --test gravity-well/test
//
// packs.js touches window.localStorage for imported packs; node has neither, so
// a minimal in-memory stub is installed before it is imported. Everything the
// validator does is pure, so only the storage helpers need it.

import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  }
};

const { LEVELS, WORLDS } = await import('../levels.js');
const { CAMPAIGN_PACK, CAMPAIGN_PACK_ID, buildCampaignPack } = await import('../campaign.js');
const Packs = await import('../packs.js');
const { PHYSICS_VERSION } = await import('../sim.js');

function resetStore() { store.clear(); }

// --------------------------------------------------------------- campaign

test('CAMPAIGN_PACK is a well-formed pack', () => {
  assert.equal(CAMPAIGN_PACK.format, 'gw-pack-1');
  assert.equal(CAMPAIGN_PACK.id, CAMPAIGN_PACK_ID);
  assert.equal(CAMPAIGN_PACK.physicsVersion, PHYSICS_VERSION);
  assert.equal(CAMPAIGN_PACK.builtIn, true);
  const v = Packs.validatePack(CAMPAIGN_PACK);
  assert.deepEqual(v.errors, []);
  assert.equal(v.ok, true);
});

test('CAMPAIGN_PACK stages mirror WORLDS, in order', () => {
  const phases = [];
  for (const lv of LEVELS) {
    if (phases.length === 0 || phases[phases.length - 1] !== lv.phase) phases.push(lv.phase);
  }
  assert.equal(CAMPAIGN_PACK.stages.length, phases.length);
  CAMPAIGN_PACK.stages.forEach((st, i) => {
    const world = WORLDS.find((w) => w.phase === phases[i]);
    assert.equal(st.id, 'w' + phases[i]);
    assert.equal(st.title, world ? world.title : 'World ' + phases[i]);
    if (world && world.blurb) assert.equal(st.blurb, world.blurb);
  });
});

test('CAMPAIGN_PACK holds every level exactly once, in LEVELS order', () => {
  const flat = Packs.packLevels(CAMPAIGN_PACK);
  assert.equal(flat.length, LEVELS.length);
  flat.forEach((entry, i) => {
    assert.equal(entry.level.id, LEVELS[i].id, 'level ' + i + ' is out of order');
    // referenced, not copied: the campaign has one source of truth
    assert.equal(entry.level, LEVELS[i]);
    assert.equal(entry.index, i);
  });
});

test('every level lands in the stage matching its phase', () => {
  for (const { level, stage } of Packs.packLevels(CAMPAIGN_PACK)) {
    assert.equal(stage.id, 'w' + level.phase, level.id + ' is in the wrong stage');
  }
});

test('buildCampaignPack is deterministic', () => {
  const a = buildCampaignPack();
  const b = buildCampaignPack();
  assert.deepEqual(
    a.stages.map((s) => [s.id, s.levels.map((l) => l.id)]),
    b.stages.map((s) => [s.id, s.levels.map((l) => l.id)])
  );
});

// -------------------------------------------------------------- validator

function minimalLevel(id) {
  return {
    id, name: 'L ' + id,
    bounds: { w: 900, h: 1200 },
    charges: 2, stackLimit: 2,
    previewSeconds: 6, showBodyPreview: true,
    ship: { x: 100, y: 1000, vx: 0, vy: -140 },
    target: { x: 700, y: 300, r: 28 },
    fixtures: [], solution: []
  };
}

function minimalPack(overrides) {
  return Object.assign({
    format: 'gw-pack-1',
    physicsVersion: PHYSICS_VERSION,
    id: 'test-pack', name: 'Test Pack', author: 'nobody', version: 1,
    stages: [{ id: 's1', title: 'Stage one', blurb: 'first', levels: [minimalLevel('a1')] }]
  }, overrides || {});
}

test('validatePack accepts an exported pack', () => {
  const v = Packs.validatePack(minimalPack());
  assert.deepEqual(v.errors, []);
  assert.equal(v.ok, true);
  assert.deepEqual(v.warnings, []);
});

test('validatePack accepts a JSON string and round-trips', () => {
  const text = JSON.stringify(minimalPack());
  const v = Packs.validatePack(text);
  assert.equal(v.ok, true);
  assert.equal(v.pack.id, 'test-pack');
  assert.equal(JSON.stringify(v.pack), text);
});

test('validatePack rejects malformed packs', () => {
  const cases = [
    [null, 'null'],
    ['not json at all {', 'unparseable string'],
    [[], 'an array'],
    [minimalPack({ format: 'gw-pack-0' }), 'wrong format'],
    [minimalPack({ id: '' }), 'empty id'],
    [minimalPack({ name: undefined }), 'missing name'],
    [minimalPack({ stages: [] }), 'no stages'],
    [minimalPack({ stages: [{ id: 's1', title: 'x', levels: [] }] }), 'no levels']
  ];
  for (const [input, label] of cases) {
    const v = Packs.validatePack(input);
    assert.equal(v.ok, false, label + ' should be rejected');
    assert.ok(v.errors.length > 0, label + ' should report an error');
    assert.equal(v.pack, null);
  }
});

test('validatePack reports bad level fields with the level in the message', () => {
  const bad = minimalPack();
  bad.stages[0].levels[0].bounds = { w: 0, h: 1200 };
  bad.stages[0].levels[0].target = { x: 1, y: 2 };
  const v = Packs.validatePack(bad);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes('bounds')));
  assert.ok(v.errors.some((e) => e.includes('target')));
  assert.ok(v.errors.every((e) => e.includes('a1')));
});

test('validatePack rejects duplicate level and stage ids', () => {
  const dupLevels = minimalPack({
    stages: [
      { id: 's1', title: 'one', levels: [minimalLevel('same')] },
      { id: 's2', title: 'two', levels: [minimalLevel('same')] }
    ]
  });
  assert.ok(Packs.validatePack(dupLevels).errors.some((e) => e.includes('duplicate level id')));

  const dupStages = minimalPack({
    stages: [
      { id: 's1', title: 'one', levels: [minimalLevel('a')] },
      { id: 's1', title: 'two', levels: [minimalLevel('b')] }
    ]
  });
  assert.ok(Packs.validatePack(dupStages).errors.some((e) => e.includes('duplicate stage id')));
});

test('a physics mismatch warns but still validates', () => {
  const v = Packs.validatePack(minimalPack({ physicsVersion: 'gw-0' }));
  assert.equal(v.ok, true);
  assert.equal(v.warnings.length, 1);
  assert.ok(v.warnings[0].includes('gw-0'));
  assert.ok(v.warnings[0].includes(PHYSICS_VERSION));
});

// ---------------------------------------------------------------- storage

test('import / list / remove round-trip through storage', () => {
  resetStore();
  assert.deepEqual(Packs.listPacks().map((p) => p.id), [CAMPAIGN_PACK_ID]);

  const res = Packs.importPack(minimalPack());
  assert.equal(res.ok, true);
  assert.equal(res.replaced, false);
  assert.deepEqual(Packs.listPacks().map((p) => p.id), [CAMPAIGN_PACK_ID, 'test-pack']);
  assert.equal(Packs.getPack('test-pack').name, 'Test Pack');

  // re-importing the same id replaces rather than duplicating
  const again = Packs.importPack(minimalPack({ name: 'Renamed' }));
  assert.equal(again.replaced, true);
  assert.equal(Packs.listPacks().length, 2);
  assert.equal(Packs.getPack('test-pack').name, 'Renamed');

  assert.equal(Packs.removePack('test-pack'), true);
  assert.deepEqual(Packs.listPacks().map((p) => p.id), [CAMPAIGN_PACK_ID]);
  assert.equal(Packs.removePack('test-pack'), false);
});

test('the built-in pack id cannot be imported over or removed', () => {
  resetStore();
  const res = Packs.importPack(minimalPack({ id: CAMPAIGN_PACK_ID }));
  assert.equal(res.ok, false);
  assert.equal(Packs.removePack(CAMPAIGN_PACK_ID), false);
  assert.equal(Packs.listPacks().length, 1);
});

test('a corrupt gw.packs entry is skipped, not fatal', () => {
  resetStore();
  store.set(Packs.PACKS_KEY, JSON.stringify([minimalPack(), { format: 'nope' }]));
  assert.deepEqual(Packs.listPacks().map((p) => p.id), [CAMPAIGN_PACK_ID, 'test-pack']);

  store.set(Packs.PACKS_KEY, 'not json');
  assert.deepEqual(Packs.listPacks().map((p) => p.id), [CAMPAIGN_PACK_ID]);
});

test('progress is stored per pack', () => {
  resetStore();
  Packs.saveProgress('campaign', { completed: { 'w1-1': true }, radioSeen: {}, lastLevel: 'w1-1' });
  Packs.saveProgress('other', { completed: { 'x': true }, radioSeen: {}, lastLevel: 'x' });
  assert.equal(Packs.progressKey('campaign'), 'gw.progress.campaign');
  assert.deepEqual(Packs.loadProgress('campaign').completed, { 'w1-1': true });
  assert.deepEqual(Packs.loadProgress('other').completed, { x: true });
  assert.deepEqual(Packs.loadProgress('missing').completed, {});
});

test('legacy gw.progress migrates to the campaign key exactly once', () => {
  resetStore();
  store.set('gw.progress', JSON.stringify({ completed: { 'w1-1': true }, radioSeen: { k: true }, lastLevel: 'w1-1' }));

  assert.equal(Packs.migrateLegacyProgress(CAMPAIGN_PACK_ID), true);
  assert.deepEqual(Packs.loadProgress(CAMPAIGN_PACK_ID).completed, { 'w1-1': true });
  assert.deepEqual(Packs.loadProgress(CAMPAIGN_PACK_ID).radioSeen, { k: true });

  // a second run must not clobber progress made since
  Packs.saveProgress(CAMPAIGN_PACK_ID, { completed: {}, radioSeen: {}, lastLevel: null });
  assert.equal(Packs.migrateLegacyProgress(CAMPAIGN_PACK_ID), false);
  assert.deepEqual(Packs.loadProgress(CAMPAIGN_PACK_ID).completed, {});
});

test('migration is a no-op with no legacy key', () => {
  resetStore();
  assert.equal(Packs.migrateLegacyProgress(CAMPAIGN_PACK_ID), false);
});
