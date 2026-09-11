// Gravity Well — editor/tools.js
//
// Pure data helpers for the level editor. No DOM, no canvas, no sim: this
// module is safe to import from a Web Worker or from node, and every function
// here is a plain value-in / value-out transform.
//
// What lives here
// ---------------
// * a seeded PRNG (mulberry32) and the asteroid-belt brush expansion, so a
//   belt is a pure function of its stroke + seed and can be re-rolled;
// * canonical JSON: `exportPackText` orders every key the same way and rounds
//   every number the same way, so export -> import -> export is BYTE
//   IDENTICAL. That is what makes the round-trip assertion in the smoke test
//   meaningful;
// * the pack/level validator used by the Pack tab, the importer and the tests;
// * small pack surgery helpers (add / move / delete / duplicate).
//
// Pack format (SPEC.md "Pack format"):
//   { format:'gw-pack-1', physicsVersion:'gw-2', id, name, author, version,
//     stages:[ { id, title, blurb, levels:[ <level>, ... ] } ] }
//
// Mobile-Safari rules apply: no structuredClone, no Array.prototype.at, no
// regex lookbehind, no top-level await.

export var PACK_FORMAT = 'gw-pack-1';
export var DEFAULT_PHYSICS_VERSION = 'gw-2';

// ---------------------------------------------------------------------------
// Deterministic PRNG
// ---------------------------------------------------------------------------

/** 32-bit string hash (FNV-1a) — used to turn a name into a seed. */
export function hashSeed(str) {
  var h = 2166136261;
  var s = String(str);
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, and identical on every engine. */
export function mulberry32(seed) {
  var a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** JSON deep copy (no structuredClone — mobile Safari). */
export function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value));
}

function round4(n) {
  if (typeof n !== 'number' || !isFinite(n)) return 0;
  var r = Math.round(n * 1e4) / 1e4;
  return r === 0 ? 0 : r; // kill -0
}

// ---------------------------------------------------------------------------
// Canonical serialisation
// ---------------------------------------------------------------------------

var PACK_ORDER = ['format', 'physicsVersion', 'id', 'name', 'author', 'version', 'stages'];
var STAGE_ORDER = ['id', 'title', 'blurb', 'levels'];
var LEVEL_ORDER = [
  'id', 'name', 'phase', 'optional', 'bounds', 'charges', 'stackLimit',
  'previewSeconds', 'showBodyPreview', 'minTolerance', 'notes',
  'ship', 'target', 'fixtures', 'radio', 'hint', 'tutorial', 'solution', 'editor'
];
var FIXTURE_ORDER = [
  'type', 'id', 'shape', 'x', 'y', 'r', 'w', 'h', 'points',
  'a', 'b', 'angle', 'oneWay', 'color',
  'vx', 'vy', 'path', 'speed', 'loop', 'pathT',
  'charges', 'order', 'accel', 'maxSpeed', 'immune'
];
var BELT_ORDER = [
  'id', 'kind', 'seed', 'stroke', 'width', 'density', 'rMin', 'rMax', 'vx', 'vy', 'ids'
];

// Key order per FIELD NAME. A nested object inherits the order registered for
// the key it hangs off; anything unregistered falls back to alphabetical, so
// the output is deterministic no matter what a level carries.
var ORDERS = {
  pack: PACK_ORDER,
  stages: STAGE_ORDER,
  levels: LEVEL_ORDER,
  fixtures: FIXTURE_ORDER,
  bounds: ['w', 'h'],
  ship: ['x', 'y', 'vx', 'vy'],
  target: ['x', 'y', 'r', 'path', 'speed', 'loop'],
  solution: ['x', 'y', 'charges'],
  radio: ['when', 'text', 'once'],
  hint: ['well'],
  well: ['x', 'y', 'charges'],
  tutorial: ['steps'],
  steps: ['when', 'text', 'marker', 'once'],
  marker: ['kind', 'x', 'y', 'charges', 'target'],
  a: ['x', 'y', 'angle'],
  b: ['x', 'y', 'angle'],
  points: ['x', 'y'],
  path: ['x', 'y'],
  stroke: ['x', 'y'],
  editor: ['belts'],
  belts: BELT_ORDER
};

/**
 * Canonicalise a value: numbers rounded, object keys emitted in the order
 * registered for `field` (then alphabetically), nulls and undefined dropped.
 * Idempotent, which is what makes the round-trip byte identical.
 */
export function canon(value, field) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return round4(value);
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Object.prototype.toString.call(value) === '[object Array]') {
    var arr = [];
    for (var i = 0; i < value.length; i++) {
      var cv = canon(value[i], field);
      if (cv !== undefined) arr.push(cv);
    }
    return arr;
  }
  if (typeof value !== 'object') return undefined;

  var order = ORDERS[field] || [];
  var out = {};
  var seen = {};
  var k, c;
  for (var j = 0; j < order.length; j++) {
    k = order[j];
    seen[k] = 1;
    if (!Object.prototype.hasOwnProperty.call(value, k)) continue;
    c = canon(value[k], k);
    if (c !== undefined) out[k] = c;
  }
  var rest = [];
  for (k in value) {
    if (!Object.prototype.hasOwnProperty.call(value, k) || seen[k]) continue;
    rest.push(k);
  }
  rest.sort();
  for (var m = 0; m < rest.length; m++) {
    c = canon(value[rest[m]], rest[m]);
    if (c !== undefined) out[rest[m]] = c;
  }
  return out;
}

/** A pack normalised to canonical shape (defaults filled, keys ordered). */
export function canonicalPack(pack) {
  var p = pack || {};
  var stages = p.stages || [];
  var src = {
    format: PACK_FORMAT,
    physicsVersion: p.physicsVersion || DEFAULT_PHYSICS_VERSION,
    id: p.id || 'my-pack',
    name: p.name || 'My Pack',
    author: p.author != null ? p.author : '',
    version: p.version != null ? p.version : 1,
    stages: []
  };
  for (var i = 0; i < stages.length; i++) {
    var st = stages[i] || {};
    var levels = st.levels || [];
    var outLevels = [];
    for (var j = 0; j < levels.length; j++) outLevels.push(canonicalLevelObject(levels[j]));
    src.stages.push({
      id: st.id || 's' + (i + 1),
      title: st.title != null ? st.title : 'Stage ' + (i + 1),
      blurb: st.blurb != null ? st.blurb : '',
      levels: outLevels
    });
  }
  return canon(src, 'pack');
}

/** Fill the defaults a level is expected to carry, without reordering. */
function canonicalLevelObject(level) {
  var lv = cloneJSON(level || {});
  if (lv.bounds == null) lv.bounds = { w: 900, h: 1200 };
  if (lv.charges == null) lv.charges = 3;
  if (lv.stackLimit == null) lv.stackLimit = 3;
  if (lv.previewSeconds == null) lv.previewSeconds = 6;
  if (lv.showBodyPreview == null) lv.showBodyPreview = true;
  if (lv.optional == null) lv.optional = false;
  if (lv.fixtures == null) lv.fixtures = [];
  if (lv.solution == null) lv.solution = [];
  if (lv.notes === '') delete lv.notes;
  if (lv.radio && !lv.radio.length) delete lv.radio;
  if (lv.tutorial && (!lv.tutorial.steps || !lv.tutorial.steps.length)) delete lv.tutorial;
  if (lv.editor && (!lv.editor.belts || !lv.editor.belts.length)) delete lv.editor;
  return lv;
}

/** A single level normalised + key-ordered (used by "export this level"). */
export function canonicalLevel(level) {
  return canon(canonicalLevelObject(level), 'levels');
}

/** Canonical pack JSON text. Export writes exactly this. */
export function exportPackText(pack) {
  return JSON.stringify(canonicalPack(pack), null, 2) + '\n';
}

/** Canonical single-level JSON text. */
export function exportLevelText(level) {
  return JSON.stringify(canonicalLevel(level), null, 2) + '\n';
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Parse pasted / uploaded JSON. Returns
 *   { ok:true, kind:'pack', pack }  |  { ok:true, kind:'level', level }
 *   { ok:false, error }
 * A bare level object (has ship + target, no stages) is a single-level import,
 * which the caller adds to the current stage.
 */
export function parseImport(text) {
  var data;
  try {
    data = JSON.parse(String(text));
  } catch (e) {
    return { ok: false, error: 'Not valid JSON: ' + (e && e.message ? e.message : String(e)) };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'Expected a JSON object' };

  if (data.stages || data.format === PACK_FORMAT) {
    var v = validatePack(data);
    if (!v.ok) return { ok: false, error: 'Pack is not valid:\n- ' + v.errors.join('\n- ') };
    return { ok: true, kind: 'pack', pack: canonicalPack(data) };
  }
  if (data.ship || data.target || data.bounds) {
    var lv = validateLevel(data, 'level');
    if (lv.length) return { ok: false, error: 'Level is not valid:\n- ' + lv.join('\n- ') };
    return { ok: true, kind: 'level', level: canonicalLevelObject(data) };
  }
  return { ok: false, error: 'Unrecognised JSON: expected a pack (with "stages") or a single level' };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

var KNOWN_TYPES = {
  obstacle: 1, asteroid: 1, drone: 1, hunter: 1, ore: 1, oreReceiver: 1,
  wormhole: 1, waypoint: 1, well: 1, repulsor: 1, deadZone: 1, allowedZone: 1
};
var SHAPED_TYPES = { obstacle: 1, deadZone: 1, allowedZone: 1 };
var WHENS = { start: 1, firstWell: 1, launch: 1, win: 1, fail: 1 };

function isNum(v) {
  return typeof v === 'number' && isFinite(v);
}

function label(prefix, i) {
  return prefix + '[' + i + ']';
}

/** Validate one level. Returns an array of human-readable problems. */
export function validateLevel(level, where) {
  var errs = [];
  var at = where || 'level';
  if (!level || typeof level !== 'object') return [at + ': not an object'];
  if (!level.id || typeof level.id !== 'string') errs.push(at + ': missing id');
  if (!level.name || typeof level.name !== 'string') errs.push(at + ': missing name');

  var b = level.bounds;
  if (!b || !isNum(b.w) || !isNum(b.h) || b.w <= 0 || b.h <= 0) errs.push(at + ': bounds needs positive w and h');
  if (!isNum(level.charges) || level.charges < 0) errs.push(at + ': charges must be a number >= 0');
  if (level.stackLimit != null && (!isNum(level.stackLimit) || level.stackLimit < 1)) {
    errs.push(at + ': stackLimit must be >= 1');
  }
  if (level.previewSeconds != null && !isNum(level.previewSeconds)) errs.push(at + ': previewSeconds must be a number');

  var s = level.ship;
  if (!s || !isNum(s.x) || !isNum(s.y)) errs.push(at + ': ship needs numeric x and y');
  var t = level.target;
  if (!t || !isNum(t.x) || !isNum(t.y) || !isNum(t.r) || t.r <= 0) errs.push(at + ': target needs x, y and a positive r');

  var fixtures = level.fixtures || [];
  if (Object.prototype.toString.call(fixtures) !== '[object Array]') {
    errs.push(at + ': fixtures must be an array');
  } else {
    var ids = {};
    for (var i = 0; i < fixtures.length; i++) {
      var f = fixtures[i];
      var fat = at + ' ' + label('fixtures', i);
      if (!f || typeof f !== 'object') { errs.push(fat + ': not an object'); continue; }
      if (!KNOWN_TYPES[f.type]) { errs.push(fat + ': unknown type "' + f.type + '"'); continue; }
      if (f.id != null) {
        if (ids[f.id]) errs.push(fat + ': duplicate id "' + f.id + '"');
        ids[f.id] = 1;
      }
      if (f.type === 'wormhole') {
        if (!f.a || !isNum(f.a.x) || !isNum(f.a.y)) errs.push(fat + ': wormhole mouth a needs x, y');
        if (!f.b || !isNum(f.b.x) || !isNum(f.b.y)) errs.push(fat + ': wormhole mouth b needs x, y');
      } else if (SHAPED_TYPES[f.type]) {
        if (f.shape === 'rect') {
          if (!isNum(f.x) || !isNum(f.y) || !isNum(f.w) || !isNum(f.h)) errs.push(fat + ': rect needs x, y, w, h');
        } else if (f.shape === 'poly') {
          if (!f.points || f.points.length < 3) errs.push(fat + ': poly needs at least 3 points');
        } else if (!isNum(f.x) || !isNum(f.y) || !isNum(f.r) || f.r <= 0) {
          errs.push(fat + ': circle needs x, y and a positive r');
        }
      } else if (!isNum(f.x) || !isNum(f.y)) {
        errs.push(fat + ': needs numeric x and y');
      }
      if (f.type === 'waypoint' && f.order != null && (!isNum(f.order) || f.order < 1)) {
        errs.push(fat + ': waypoint order must be >= 1');
      }
      if ((f.type === 'well' || f.type === 'repulsor') && f.charges != null &&
          (!isNum(f.charges) || f.charges < 1 || f.charges > 5)) {
        errs.push(fat + ': charges must be 1..5');
      }
    }
  }

  var sol = level.solution || [];
  if (Object.prototype.toString.call(sol) !== '[object Array]') {
    errs.push(at + ': solution must be an array');
  } else {
    for (var k = 0; k < sol.length; k++) {
      var w = sol[k];
      if (!w || !isNum(w.x) || !isNum(w.y) || !isNum(w.charges) || w.charges < 1) {
        errs.push(at + ' ' + label('solution', k) + ': needs x, y and charges >= 1');
      }
    }
  }

  if (level.tutorial) {
    var steps = level.tutorial.steps || [];
    for (var m = 0; m < steps.length; m++) {
      var st = steps[m];
      if (!st || !WHENS[st.when]) errs.push(at + ' ' + label('tutorial.steps', m) + ': bad "when"');
      else if (!st.text) errs.push(at + ' ' + label('tutorial.steps', m) + ': empty text');
    }
  }
  return errs;
}

/** Validate a whole pack. Returns {ok, errors:[]}. */
export function validatePack(pack) {
  var errs = [];
  if (!pack || typeof pack !== 'object') return { ok: false, errors: ['pack: not an object'] };
  if (pack.format !== PACK_FORMAT) errs.push('pack: format must be "' + PACK_FORMAT + '"');
  if (!pack.id || typeof pack.id !== 'string') errs.push('pack: missing id');
  if (!pack.name || typeof pack.name !== 'string') errs.push('pack: missing name');
  if (pack.version != null && !isNum(pack.version)) errs.push('pack: version must be a number');

  var stages = pack.stages;
  if (Object.prototype.toString.call(stages) !== '[object Array]' || !stages.length) {
    errs.push('pack: needs at least one stage');
    return { ok: errs.length === 0, errors: errs };
  }
  var stageIds = {};
  var levelIds = {};
  for (var i = 0; i < stages.length; i++) {
    var st = stages[i];
    var sat = label('stages', i);
    if (!st || typeof st !== 'object') { errs.push(sat + ': not an object'); continue; }
    if (!st.id) errs.push(sat + ': missing id');
    else if (stageIds[st.id]) errs.push(sat + ': duplicate stage id "' + st.id + '"');
    stageIds[st.id] = 1;
    if (!st.title) errs.push(sat + ': missing title');
    var levels = st.levels;
    if (Object.prototype.toString.call(levels) !== '[object Array]') {
      errs.push(sat + ': levels must be an array');
      continue;
    }
    for (var j = 0; j < levels.length; j++) {
      var lv = levels[j];
      var errsHere = validateLevel(lv, sat + ' ' + label('levels', j));
      for (var k = 0; k < errsHere.length; k++) errs.push(errsHere[k]);
      if (lv && lv.id) {
        if (levelIds[lv.id]) errs.push(sat + ' ' + label('levels', j) + ': duplicate level id "' + lv.id + '"');
        levelIds[lv.id] = 1;
      }
    }
  }
  return { ok: errs.length === 0, errors: errs };
}

// ---------------------------------------------------------------------------
// Templates + pack surgery
// ---------------------------------------------------------------------------

/** A blank but playable level: ship at the bottom coasting up, target above. */
export function newLevel(opts) {
  var o = opts || {};
  var w = o.w || 900;
  var h = o.h || 1200;
  return {
    id: o.id || 'lvl-1',
    name: o.name || 'New Level',
    optional: false,
    bounds: { w: w, h: h },
    charges: 3,
    stackLimit: 3,
    previewSeconds: 6,
    showBodyPreview: true,
    ship: { x: Math.round(w / 2), y: Math.round(h * 0.9), vx: 0, vy: -120 },
    target: { x: Math.round(w / 2), y: Math.round(h * 0.16), r: 28 },
    fixtures: [],
    solution: []
  };
}

export function newStage(index) {
  return { id: 's' + index, title: 'Stage ' + index, blurb: '', levels: [] };
}

/** A fresh working pack with one stage and one level. */
export function newPack() {
  var stage = newStage(1);
  stage.levels.push(newLevel({ id: 'lvl-1' }));
  return {
    format: PACK_FORMAT,
    physicsVersion: DEFAULT_PHYSICS_VERSION,
    id: 'my-pack',
    name: 'My Pack',
    author: '',
    version: 1,
    stages: [stage]
  };
}

/** Every level id already used anywhere in the pack. */
export function levelIds(pack) {
  var out = {};
  var stages = (pack && pack.stages) || [];
  for (var i = 0; i < stages.length; i++) {
    var levels = stages[i].levels || [];
    for (var j = 0; j < levels.length; j++) if (levels[j] && levels[j].id) out[levels[j].id] = 1;
  }
  return out;
}

/** `base`, `base-2`, `base-3`, ... — the first spelling not in `used`. */
export function uniqueId(base, used) {
  var id = String(base || 'id');
  if (!used[id]) return id;
  var n = 2;
  while (used[id + '-' + n]) n++;
  return id + '-' + n;
}

/** Unique fixture id inside one level, e.g. 'drone-3'. */
export function uniqueFixtureId(level, base) {
  var used = {};
  var fixtures = (level && level.fixtures) || [];
  for (var i = 0; i < fixtures.length; i++) if (fixtures[i].id) used[fixtures[i].id] = 1;
  var n = 1;
  while (used[base + '-' + n]) n++;
  return base + '-' + n;
}

/** Move item `from` -> `to` inside an array (clamped). Returns the array. */
export function moveInArray(arr, from, to) {
  if (!arr || from < 0 || from >= arr.length) return arr;
  var t = to < 0 ? 0 : to >= arr.length ? arr.length - 1 : to;
  if (t === from) return arr;
  var item = arr.splice(from, 1)[0];
  arr.splice(t, 0, item);
  return arr;
}

// ---------------------------------------------------------------------------
// Asteroid belt brush
//
// A belt is stored as metadata on `level.editor.belts` and expanded into plain
// `obstacle` / `asteroid` fixtures the sim already understands. Expansion is a
// pure function of (stroke, width, density, radius range, seed), so the same
// belt always produces the same rocks and "Re-roll" is just seed + 1.
// ---------------------------------------------------------------------------

/** Total length of a polyline. */
function strokeLength(pts) {
  var total = 0;
  for (var i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return total;
}

/** Point at arc-length `d` along the polyline, plus the unit tangent there. */
function pointAtLength(pts, d) {
  var acc = 0;
  for (var i = 1; i < pts.length; i++) {
    var dx = pts[i].x - pts[i - 1].x;
    var dy = pts[i].y - pts[i - 1].y;
    var seg = Math.hypot(dx, dy);
    if (seg <= 1e-9) continue;
    if (acc + seg >= d) {
      var u = (d - acc) / seg;
      return { x: pts[i - 1].x + dx * u, y: pts[i - 1].y + dy * u, tx: dx / seg, ty: dy / seg };
    }
    acc += seg;
  }
  var last = pts[pts.length - 1];
  var prev = pts.length > 1 ? pts[pts.length - 2] : last;
  var ldx = last.x - prev.x;
  var ldy = last.y - prev.y;
  var lm = Math.hypot(ldx, ldy) || 1;
  return { x: last.x, y: last.y, tx: ldx / lm, ty: ldy / lm };
}

export function newBelt(opts) {
  var o = opts || {};
  return {
    id: o.id || 'belt-1',
    kind: o.kind || 'obstacle',   // 'obstacle' (static rock) | 'asteroid' (drifting)
    seed: o.seed != null ? o.seed : 1,
    stroke: o.stroke || [],
    width: o.width != null ? o.width : 120,
    density: o.density != null ? o.density : 1,   // rocks per 100 units of stroke
    rMin: o.rMin != null ? o.rMin : 16,
    rMax: o.rMax != null ? o.rMax : 34,
    vx: o.vx != null ? o.vx : 0,
    vy: o.vy != null ? o.vy : 0,
    ids: []
  };
}

/**
 * Expand a belt into fixtures. Rocks are spread along the stroke with a
 * jittered spacing and a jittered lateral offset inside `width`, and rejected
 * when they would overlap a rock already placed.
 */
export function expandBelt(belt) {
  var pts = belt.stroke || [];
  if (pts.length < 2) return [];
  var rng = mulberry32(hashSeed(belt.id) ^ ((belt.seed >>> 0) * 2654435761));
  var len = strokeLength(pts);
  if (len < 1) return [];
  var density = belt.density > 0 ? belt.density : 1;
  var count = Math.max(1, Math.round((len / 100) * density * 2));
  var half = (belt.width || 120) / 2;
  var out = [];

  for (var i = 0; i < count; i++) {
    var d = ((i + 0.5) / count) * len + (rng() - 0.5) * (len / count) * 0.8;
    if (d < 0) d = 0;
    if (d > len) d = len;
    var p = pointAtLength(pts, d);
    var nx = -p.ty;
    var ny = p.tx;
    var off = (rng() * 2 - 1) * half;
    var r = belt.rMin + rng() * Math.max(0, belt.rMax - belt.rMin);
    var x = p.x + nx * off;
    var y = p.y + ny * off;

    var clash = false;
    for (var j = 0; j < out.length; j++) {
      var o = out[j];
      if (Math.hypot(o.x - x, o.y - y) < (o.r + r) * 0.92) { clash = true; break; }
    }
    if (clash) continue;

    var fx = {
      type: belt.kind === 'asteroid' ? 'asteroid' : 'obstacle',
      id: belt.id + '-' + out.length,
      x: round4(x),
      y: round4(y),
      r: round4(r)
    };
    if (fx.type === 'obstacle') fx.shape = 'circle';
    if (fx.type === 'asteroid') {
      fx.vx = round4(belt.vx || 0);
      fx.vy = round4(belt.vy || 0);
    }
    out.push(fx);
  }
  return out;
}

/**
 * Replace the fixtures a belt previously generated with a fresh expansion.
 * Mutates `level` and returns the new fixture list for the belt.
 */
export function applyBelt(level, belt) {
  if (!level.editor) level.editor = { belts: [] };
  if (!level.editor.belts) level.editor.belts = [];
  var old = {};
  var i;
  for (i = 0; i < (belt.ids || []).length; i++) old[belt.ids[i]] = 1;
  var keep = [];
  var fixtures = level.fixtures || [];
  for (i = 0; i < fixtures.length; i++) if (!old[fixtures[i].id]) keep.push(fixtures[i]);

  var made = expandBelt(belt);
  belt.ids = [];
  for (i = 0; i < made.length; i++) {
    keep.push(made[i]);
    belt.ids.push(made[i].id);
  }
  level.fixtures = keep;

  var belts = level.editor.belts;
  var found = -1;
  for (i = 0; i < belts.length; i++) if (belts[i].id === belt.id) found = i;
  if (found >= 0) belts[found] = belt;
  else belts.push(belt);
  return made;
}

/** Remove a belt and every fixture it generated. */
export function removeBelt(level, beltId) {
  if (!level.editor || !level.editor.belts) return;
  var belts = level.editor.belts;
  var belt = null;
  var i;
  for (i = 0; i < belts.length; i++) if (belts[i].id === beltId) belt = belts[i];
  if (!belt) return;
  var drop = {};
  for (i = 0; i < (belt.ids || []).length; i++) drop[belt.ids[i]] = 1;
  var keep = [];
  var fixtures = level.fixtures || [];
  for (i = 0; i < fixtures.length; i++) if (!drop[fixtures[i].id]) keep.push(fixtures[i]);
  level.fixtures = keep;
  level.editor.belts = belts.filter(function (b) { return b.id !== beltId; });
  if (!level.editor.belts.length) delete level.editor;
}

/** Next free belt id in a level. */
export function nextBeltId(level) {
  var belts = (level.editor && level.editor.belts) || [];
  var n = belts.length + 1;
  var used = {};
  for (var i = 0; i < belts.length; i++) used[belts[i].id] = 1;
  while (used['belt-' + n]) n++;
  return 'belt-' + n;
}

// ---------------------------------------------------------------------------
// Geometry shared by the canvas and the analyser
// ---------------------------------------------------------------------------

/** Point-in-polygon (ray casting; no lookbehind, no fancy syntax). */
export function pointInPoly(points, x, y) {
  var inside = false;
  var n = points.length;
  for (var i = 0, j = n - 1; i < n; j = i++) {
    var xi = points[i].x, yi = points[i].y;
    var xj = points[j].x, yj = points[j].y;
    var hit = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

/** Is (x,y) inside a zone fixture (circle / rect / poly)? */
export function pointInZone(zone, x, y) {
  if (!zone) return false;
  if (zone.shape === 'rect') {
    return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
  }
  if (zone.shape === 'poly') return pointInPoly(zone.points || [], x, y);
  return Math.hypot(x - zone.x, y - zone.y) <= (zone.r || 0);
}

/** Axis-aligned bounding box of a zone/fixture, for hit tests and handles. */
export function fixtureBBox(f) {
  if (f.type === 'wormhole') {
    var ax = f.a ? f.a.x : 0, ay = f.a ? f.a.y : 0;
    var bx = f.b ? f.b.x : 0, by = f.b ? f.b.y : 0;
    var r = f.r != null ? f.r : 26;
    return {
      x: Math.min(ax, bx) - r, y: Math.min(ay, by) - r,
      w: Math.abs(ax - bx) + 2 * r, h: Math.abs(ay - by) + 2 * r
    };
  }
  if (f.shape === 'rect') return { x: f.x, y: f.y, w: f.w, h: f.h };
  if (f.shape === 'poly') {
    var pts = f.points || [];
    if (!pts.length) return { x: f.x || 0, y: f.y || 0, w: 0, h: 0 };
    var minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].x < minX) minX = pts[i].x;
      if (pts[i].x > maxX) maxX = pts[i].x;
      if (pts[i].y < minY) minY = pts[i].y;
      if (pts[i].y > maxY) maxY = pts[i].y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  var rr = f.r != null ? f.r : 14;
  return { x: (f.x || 0) - rr, y: (f.y || 0) - rr, w: rr * 2, h: rr * 2 };
}

/** Centroid of a fixture — what the move handle drags. */
export function fixtureCentre(f) {
  var bb = fixtureBBox(f);
  return { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
}
