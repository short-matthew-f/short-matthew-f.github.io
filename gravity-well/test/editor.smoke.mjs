// Gravity Well — test/editor.smoke.mjs
//
// End-to-end smoke test for the LEVEL EDITOR. Serves the repo root over plain
// node:http and drives editor.html in Chromium at a phone and a desktop
// viewport, building a real level with the real UI:
//
//   palette -> ship / target / obstacle, a dragged rect dead zone, a wormhole
//   pair with a rotated mouth, a tutorial step with a marker, export + import
//   round trip, Lint (Web Worker) and the Test flight round trip.
//
// Any console error, page error or failed request fails the run.
//
//   node gravity-well/test/editor.smoke.mjs
//
// Server + browser setup mirrors test/ui.smoke.mjs, including the way
// playwright is resolved from a local node_modules or the global npm root:
//   npm i --no-save playwright   (outside the repo)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const SHOT_DIR = process.env.GW_SHOT_DIR ||
  '/tmp/claude-0/-home-user-short-matthew-f-github-io/b1f7aa4e-f5b6-55a3-8748-433796889955/scratchpad';

const VIEWPORTS = [
  { name: 'phone-390x844', width: 390, height: 844 },
  { name: 'desktop-1280x800', width: 1280, height: 800 }
];

const IGNORED_CONSOLE = [/manifest/i, /favicon/i];

// The level the test authors. Every number is typed into a real inspector
// field after the palette tap, so the level is byte-for-byte the one probed
// offline: zero wells fails ('lost'), and a single 1-charge well wins from a
// 12-cell region — which is exactly what the "Solvable with one well" lint
// warning must report.
const LEVEL = {
  id: 'smoke-1',
  name: 'Smoke Level',
  bounds: { w: 600, h: 600 },
  ship: { x: 300, y: 560, vx: 60, vy: -140 },
  target: { x: 300, y: 100, r: 50 },
  rock: { x: 500, y: 420, r: 60 },
  dead: { x: 380, y: 40, w: 180, h: 120 },
  hole: { ax: 370, ay: 540, bx: 590, by: 540 }
};

// --------------------------------------------------------------- playwright

function unwrap(mod) {
  if (mod && mod.chromium) return mod;
  if (mod && mod.default && mod.default.chromium) return mod.default;
  return mod;
}

async function loadPlaywright() {
  try {
    return unwrap(await import('playwright'));
  } catch (e) { /* fall through to global lookup */ }
  const roots = [];
  try { roots.push(execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch (e) { /* ignore */ }
  roots.push('/opt/node22/lib/node_modules', '/usr/local/lib/node_modules', '/usr/lib/node_modules');
  for (const root of roots) {
    if (!root) continue;
    const entry = path.join(root, 'playwright', 'index.js');
    if (fs.existsSync(entry)) return unwrap(await import(pathToFileURL(entry).href));
  }
  throw new Error('playwright not resolvable — run `npm i --no-save playwright` outside the repo');
}

// ------------------------------------------------------------ static server

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch (e) { res.writeHead(400); res.end('bad url'); return; }
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.join(REPO_ROOT, urlPath);
    if (!file.startsWith(REPO_ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// ------------------------------------------------------------------ helpers

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT: ' + msg);
  console.log('  ok  ' + msg);
}

function note(msg) {
  console.log('  --  ' + msg);
}

function near(a, b, tol) {
  return Math.abs(a - b) <= (tol == null ? 8 : tol);
}

// World point -> page coordinates, read live from the editor's camera.
function worldToPage(page, wx, wy) {
  return page.evaluate(([x, y]) => {
    const v = window.GWED.view;
    const rect = document.getElementById('ed-canvas').getBoundingClientRect();
    return { x: rect.left + x * v.scale + v.ox, y: rect.top + y * v.scale + v.oy };
  }, [wx, wy]);
}

async function tapWorld(page, wx, wy) {
  const p = await worldToPage(page, wx, wy);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(80);
}

async function dragWorld(page, from, to) {
  const a = await worldToPage(page, from.x, from.y);
  const b = await worldToPage(page, to.x, to.y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 });
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

// Type into a real <input>/<textarea> and fire the change the editor commits on.
async function setField(page, selector, value) {
  await page.fill(selector, String(value));
  await page.dispatchEvent(selector, 'change');
  await page.waitForTimeout(40);
}

async function pickTool(page, tool) {
  await page.click('#tab-palette');
  await page.click('#pal-' + tool);
  await page.waitForTimeout(40);
}

function level(page) {
  return page.evaluate(() => window.GWED.level());
}

function fixtures(page) {
  return page.evaluate(() => window.GWED.level().fixtures || []);
}

function findFixture(list, type) {
  for (let i = 0; i < list.length; i++) if (list[i].type === type) return { fx: list[i], index: i };
  return { fx: null, index: -1 };
}

// Select something the way a tap would, then open the Inspect tab.
async function selectRef(page, ref) {
  await page.evaluate((r) => {
    window.GWED.app.setSel([r]);
    window.GWED.app.refreshPanel();
    window.GWED.draw();
  }, ref);
  await page.click('#tab-inspect');
  await page.waitForTimeout(60);
}

function selectFixture(page, index) {
  return selectRef(page, { kind: 'fixture', index: index });
}

// ---------------------------------------------------------------- the run

async function runViewport(browser, vp, baseURL) {
  console.log('\n== ' + vp.name + ' ==');
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, acceptDownloads: true });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    problems.push('console.error: ' + text);
  });
  page.on('pageerror', (err) => problems.push('pageerror: ' + (err && err.message ? err.message : String(err))));
  page.on('requestfailed', (req) => {
    if (IGNORED_CONSOLE.some((re) => re.test(req.url()))) return;
    if (req.url().indexOf('blob:') === 0) return; // the export download link
    problems.push('requestfailed: ' + req.url());
  });
  page.on('download', (d) => { d.path().catch(() => {}); });

  const EDITOR = baseURL + '/gravity-well/editor.html';

  // ---- open the editor on a clean slate
  await page.goto(EDITOR, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.GWED, null, { timeout: 10000 });
  await page.evaluate(() => {
    try {
      ['gw.editor.pack', 'gw.editor.cursor', 'gw.editor.testLevel',
        'gw.editor.testWells', 'gw.editor.lastTrail'].forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.GWED, null, { timeout: 10000 });

  assert(await page.isVisible('#ed-canvas'), 'editor canvas is visible');
  assert(await page.isVisible('#ed-panel'), 'tool panel is visible');
  assert(await page.locator('.ed-tab').count() === 6, 'panel has six tabs');
  assert(await page.evaluate(() => getComputedStyle(document.getElementById('ed-canvas')).touchAction) === 'none',
    'canvas has touch-action: none');
  const smallButtons = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('button, .ed-tab, .ed-pal').forEach((b) => {
      if (b.offsetParent === null) return;
      const r = b.getBoundingClientRect();
      if (r.height > 0 && r.height < 44) bad.push((b.id || b.className) + ' h=' + Math.round(r.height));
    });
    return bad;
  });
  assert(smallButtons.length === 0, 'every visible button is at least 44px tall' +
    (smallButtons.length ? ' (' + smallButtons.join(', ') + ')' : ''));
  await page.screenshot({ path: path.join(SHOT_DIR, 'ed-' + vp.name + '-open.png') });

  // ---- Level tab: a small board keeps the analysis quick
  await page.click('#tab-level');
  await setField(page, '#lvl-id', LEVEL.id);
  await setField(page, '#lvl-name', LEVEL.name);
  await setField(page, '#lvl-bounds-w', LEVEL.bounds.w);
  await setField(page, '#lvl-bounds-h', LEVEL.bounds.h);
  await setField(page, '#lvl-charges', 1);
  await setField(page, '#lvl-stack', 1);
  let lv = await level(page);
  assert(lv.bounds.w === 600 && lv.bounds.h === 600 && lv.charges === 1,
    'Level tab number fields set bounds 600x600 and a 1-charge budget');

  // ---- palette: ship
  await pickTool(page, 'ship');
  await tapWorld(page, LEVEL.ship.x, LEVEL.ship.y);
  lv = await level(page);
  assert(near(lv.ship.x, LEVEL.ship.x) && near(lv.ship.y, LEVEL.ship.y),
    'tapping the board with the ship tool moves the ship (' + Math.round(lv.ship.x) + ',' + Math.round(lv.ship.y) + ')');
  assert(await page.evaluate(() => window.GWED.app.sel.length === 1 && window.GWED.app.sel[0].kind === 'ship'),
    'the ship is selected immediately after placement');
  await page.click('#tab-inspect');
  await setField(page, '#insp-x', LEVEL.ship.x);
  await setField(page, '#insp-y', LEVEL.ship.y);
  await setField(page, '#insp-vx', LEVEL.ship.vx);
  await setField(page, '#insp-vy', LEVEL.ship.vy);

  // ---- the velocity handle reads as time and is clamped
  //      (a real phone session dragged it to 1280 u/s, which no well can bend)
  await selectRef(page, { kind: 'ship', index: 0 });
  for (let z = 0; z < 10; z++) {
    if (await page.evaluate(() => window.GWED.view.scale) < 0.22) break;
    await page.click('#ed-zoom-out');
    await page.waitForTimeout(40);
  }
  const handle = await page.evaluate(() => {
    const lv = window.GWED.level();
    const sp = Math.hypot(lv.ship.vx, lv.ship.vy);
    const a = Math.atan2(lv.ship.vy, lv.ship.vx);
    return { x: lv.ship.x + Math.cos(a) * (40 + sp * 2), y: lv.ship.y + Math.sin(a) * (40 + sp * 2) };
  });
  await dragWorld(page, handle, { x: LEVEL.ship.x, y: LEVEL.ship.y - 1000 });
  lv = await level(page);
  const dragged = Math.hypot(lv.ship.vx, lv.ship.vy);
  assert(dragged > 200 && dragged <= 400,
    'dragging the velocity handle right across the board clamps at 400 u/s (got ' + Math.round(dragged) + ')');
  await page.click('#ed-zoom-fit');
  await page.waitForTimeout(80);
  await page.click('#tab-inspect');
  await setField(page, '#insp-speed', 152.3);
  await setField(page, '#insp-heading', -66.8);
  lv = await level(page);
  assert(near(lv.ship.vx, LEVEL.ship.vx, 2) && near(lv.ship.vy, LEVEL.ship.vy, 2),
    'the speed/heading fields write vx/vy (' + Math.round(lv.ship.vx) + ',' + Math.round(lv.ship.vy) + ')');
  await setField(page, '#insp-vx', LEVEL.ship.vx);
  await setField(page, '#insp-vy', LEVEL.ship.vy);
  assert(await page.evaluate(() => Math.round(parseFloat(document.getElementById('insp-speed').value))) === 152,
    'and editing vx/vy syncs speed back (152 u/s)');
  assert((await page.textContent('#ed-hud')).indexOf('ship 152 u/s') >= 0, 'the HUD shows the ship speed');

  // ---- palette: target
  await pickTool(page, 'target');
  await tapWorld(page, LEVEL.target.x, LEVEL.target.y);
  lv = await level(page);
  assert(near(lv.target.x, LEVEL.target.x) && near(lv.target.y, LEVEL.target.y), 'target tool places the target');
  await page.click('#tab-inspect');
  await setField(page, '#insp-x', LEVEL.target.x);
  await setField(page, '#insp-y', LEVEL.target.y);
  await setField(page, '#insp-r', LEVEL.target.r);

  // ---- palette: obstacle
  await pickTool(page, 'obstacle-circle');
  await tapWorld(page, LEVEL.rock.x, LEVEL.rock.y);
  let fx = await fixtures(page);
  let rock = findFixture(fx, 'obstacle');
  assert(rock.fx && rock.fx.shape === 'circle', 'obstacle tool adds a circle obstacle');
  await selectFixture(page, rock.index);
  await setField(page, '#insp-x', LEVEL.rock.x);
  await setField(page, '#insp-y', LEVEL.rock.y);
  await setField(page, '#insp-r', LEVEL.rock.r);

  // ---- drag out a rect dead zone
  await pickTool(page, 'deadzone-rect');
  await dragWorld(page, { x: 360, y: 60 }, { x: 520, y: 170 });
  fx = await fixtures(page);
  let dead = findFixture(fx, 'deadZone');
  assert(dead.fx && dead.fx.shape === 'rect' && dead.fx.w > 40 && dead.fx.h > 20,
    'dragging with the dead-zone tool draws a rect zone (' + Math.round(dead.fx.w) + 'x' + Math.round(dead.fx.h) + ')');
  await selectFixture(page, dead.index);
  await setField(page, '#insp-x', LEVEL.dead.x);
  await setField(page, '#insp-y', LEVEL.dead.y);
  await setField(page, '#insp-w', LEVEL.dead.w);
  await setField(page, '#insp-h', LEVEL.dead.h);

  // ---- wormhole pair + rotate a mouth
  await pickTool(page, 'wormhole');
  await tapWorld(page, 480, 540);
  fx = await fixtures(page);
  let hole = findFixture(fx, 'wormhole');
  assert(hole.fx && hole.fx.a && hole.fx.b, 'wormhole tool adds a linked pair of mouths');
  await selectFixture(page, hole.index);
  await setField(page, '#insp-angle-a', 90);
  fx = await fixtures(page);
  hole = findFixture(fx, 'wormhole');
  assert(Math.abs(hole.fx.a.angle - Math.PI / 2) < 1e-6,
    'rotating mouth A to 90° sets its exit angle to PI/2 (' + hole.fx.a.angle.toFixed(4) + ')');
  await setField(page, '#insp-angle-a', 180);
  await setField(page, '#insp-ax', LEVEL.hole.ax);
  await setField(page, '#insp-ay', LEVEL.hole.ay);
  await setField(page, '#insp-bx', LEVEL.hole.bx);
  await setField(page, '#insp-by', LEVEL.hole.by);
  await setField(page, '#insp-angle-b', 0);
  await page.screenshot({ path: path.join(SHOT_DIR, 'ed-' + vp.name + '-built.png') });

  // ---- tutorial step with a marker picked on the board
  await page.click('#tab-tutorial');
  await page.click('#tut-add');
  await page.waitForTimeout(80);
  await setField(page, '#tut-text-0', 'Put the charge beside your line, never in front of it.');
  await page.selectOption('#tut-marker-0', 'well');
  await page.waitForTimeout(80);
  await page.click('#tut-pick-0');
  await page.waitForTimeout(80);
  await tapWorld(page, 160, 380);
  lv = await level(page);
  const step0 = lv.tutorial.steps[0];
  assert(step0 && step0.when === 'start' && step0.text.length > 10, 'a tutorial step was added');
  assert(step0.marker && step0.marker.kind === 'well' && near(step0.marker.x, 160) && near(step0.marker.y, 380),
    'the step marker was positioned by tapping the board (' + step0.marker.x + ',' + step0.marker.y + ')');

  // ---- export, validate, and round trip through import
  await page.click('#tab-pack');
  await page.click('#pk-export-pack');
  await page.waitForTimeout(200);
  const exportA = await page.inputValue('#pk-export-out');
  let parsed = null;
  try { parsed = JSON.parse(exportA); } catch (e) { parsed = null; }
  assert(parsed && parsed.format === 'gw-pack-1' && parsed.stages.length === 1,
    'exported JSON parses as a gw-pack-1 pack');
  assert(parsed.stages[0].levels[0].id === LEVEL.id, 'the exported pack contains the level we built');
  const check = await page.evaluate(() => window.GWED.validatePack());
  assert(check.ok, 'the exported pack validates' + (check.ok ? '' : ': ' + check.errors.join('; ')));

  await page.fill('#pk-import-text', exportA);
  await page.click('#pk-import-btn');
  await page.waitForTimeout(300);
  await page.click('#pk-export-pack');
  await page.waitForTimeout(200);
  const exportB = await page.inputValue('#pk-export-out');
  assert(exportB === exportA, 'export -> import -> export is byte identical (' + exportA.length + ' bytes)');

  // ---- single-level import lands in the current stage
  const levelText = await page.evaluate(() => window.GWED.exportLevelText());
  await page.fill('#pk-import-text', levelText);
  await page.click('#pk-import-btn');
  await page.waitForTimeout(300);
  const stageLevels = await page.evaluate(() => window.GWED.pack().stages[0].levels.length);
  assert(stageLevels === 2, 'importing a single level adds it to the current stage');
  await page.evaluate(() => window.GWED.undo());
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.GWED.pack().stages[0].levels.length) === 1,
    'undo removes the imported level again');
  await page.evaluate(() => window.GWED.redo());
  await page.waitForTimeout(150);
  assert(await page.evaluate(() => window.GWED.pack().stages[0].levels.length) === 2, 'redo puts it back');
  await page.evaluate(() => window.GWED.undo());
  await page.waitForTimeout(200);

  // ---- Lint in the Web Worker
  await page.click('#tab-analyse');
  await setField(page, '#an-floor', 40);
  await page.click('#an-lint');
  await page.waitForFunction(() => {
    const el = document.getElementById('an-out');
    return el && /one well|No single well/i.test(el.textContent);
  }, null, { timeout: 90000 });
  const lintText = await page.textContent('#an-out');
  assert(/Solvable with one well/i.test(lintText),
    'Lint reports "Solvable with one well" on the trivial level');
  assert(/Zero wells fails/i.test(lintText), 'Lint confirms zero wells fails');
  await page.screenshot({ path: path.join(SHOT_DIR, 'ed-' + vp.name + '-lint.png') });

  // ---- lint flags a ship nothing can bend
  await selectRef(page, { kind: 'ship', index: 0 });
  await setField(page, '#insp-vy', -1258);
  await page.click('#tab-analyse');
  await page.click('#an-lint');
  await page.waitForFunction(() => {
    const el = document.getElementById('an-out');
    return el && /playable range|No single well|one well/i.test(el.textContent);
  }, null, { timeout: 90000 });
  const fastText = await page.textContent('#an-out');
  assert(/far outside the playable range/i.test(fastText),
    'Lint warns about a ship speed no well can bend: ' +
    (fastText.match(/Ship speed [^.]*/) || ['?'])[0]);
  await selectRef(page, { kind: 'ship', index: 0 });
  await setField(page, '#insp-vy', LEVEL.ship.vy);
  await page.click('#tab-analyse');

  // ---- hot zone sweep paints an overlay
  await setField(page, '#an-charges', 1);
  await setField(page, '#an-step', 48);
  await page.click('#an-hotzone');
  await page.waitForFunction(() => {
    const el = document.getElementById('an-out');
    return el && /Hot zone/i.test(el.textContent);
  }, null, { timeout: 60000 });
  const hzText = await page.textContent('#an-out');
  assert(/region/i.test(hzText), 'hot-zone sweep reports its regions: ' + hzText.replace(/\s+/g, ' ').slice(0, 90));
  assert(await page.evaluate(() => !!window.GWED.app.overlay.hotzone), 'the hot-zone overlay is on the canvas');
  await page.screenshot({ path: path.join(SHOT_DIR, 'ed-' + vp.name + '-hotzone.png') });

  // ---- an authored solution + per-well tolerance discs
  await page.click('#tab-level');
  await page.click('#lvl-add-well');
  await page.waitForTimeout(120);
  await page.click('#tab-inspect');
  await setField(page, '#insp-x', 168);
  await setField(page, '#insp-y', 345);
  await setField(page, '#insp-charges', 1);
  lv = await level(page);
  assert(lv.solution.length === 1 && lv.solution[0].x === 168, 'a solution well was added and positioned');

  await page.click('#tab-analyse');
  await page.click('#an-tolerance');
  await page.waitForFunction(() => {
    const el = document.getElementById('an-out');
    return el && /well 1:/i.test(el.textContent);
  }, null, { timeout: 90000 });
  const tolText = await page.textContent('#an-out');
  assert(/well 1:/i.test(tolText), 'Tolerance reports a per-well radius: ' + tolText.replace(/\s+/g, ' ').slice(0, 80));
  assert(await page.evaluate(() => (window.GWED.app.overlay.tolerance || []).length === 1),
    'the tolerance disc is drawn on the canvas');

  // ---- autosave survives a reload
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.GWED, null, { timeout: 10000 });
  lv = await level(page);
  assert(lv.id === LEVEL.id && (lv.fixtures || []).length === 3,
    'the working pack is restored from localStorage after a reload');

  // ---- Test flight round trip
  await page.click('#ed-test');
  await page.waitForTimeout(600);
  const inTestMode = await page.evaluate(() => {
    if (!window.GW) return false;
    return !!window.GW.testMode;
  }).catch(() => false);
  if (inTestMode) {
    const testLevelId = await page.evaluate(() => window.GW.level && window.GW.level.id);
    assert(testLevelId === LEVEL.id, 'Test opened index.html?test=1 with the edited level');
    assert(await page.isVisible('#btn-back-editor'), 'the test view offers "Back to editor"');
    await page.click('#btn-back-editor');
    await page.waitForFunction(() => !!window.GWED, null, { timeout: 10000 });
    lv = await level(page);
    assert(lv.id === LEVEL.id, 'coming back from the test restores the editor from autosave');
  } else {
    note('SKIPPED: index.html?test=1 did not enter test mode in this build — ' +
      'the Test button still wrote gw.editor.testLevel and navigated.');
    const wrote = await page.evaluate(() => {
      try { return !!localStorage.getItem('gw.editor.testLevel'); } catch (e) { return false; }
    });
    assert(wrote, 'Test wrote gw.editor.testLevel before navigating');
    await page.goto(EDITOR, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.GWED, null, { timeout: 10000 });
  }

  // ---- returning from a Test flight: ghost trail + "Use as solution"
  await page.evaluate(() => {
    const pts = [];
    for (let i = 0; i < 40; i++) pts.push({ x: 300 + i * 2, y: 560 - i * 10, brk: false });
    localStorage.setItem('gw.editor.lastTrail', JSON.stringify({
      levelId: 'smoke-1', outcome: 'fail', reason: 'lost', t: 3.2, points: pts
    }));
    localStorage.setItem('gw.editor.testWells', JSON.stringify([{ x: 200, y: 300, charges: 1 }]));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.GWED, null, { timeout: 10000 });
  assert(await page.evaluate(() => (window.GWED.app.ghost || []).length === 40),
    'the last test flight\'s trail comes back as a ghost overlay');
  assert(await page.isVisible('#ed-toolstrip'), 'the wells from the test are offered as the solution');
  await page.click('#ed-tool-done');
  await page.waitForTimeout(200);
  lv = await level(page);
  assert(lv.solution.length === 1 && lv.solution[0].x === 200,
    '"Use as solution" takes the wells the test flight ended with');

  // ---- polygon tool, belt brush, duplicate/delete and the confirm dialog,
  //      all on a throwaway level so the analysed one is untouched
  await page.click('#tab-pack');
  await page.click('#pk-new-level');
  await page.waitForTimeout(150);
  assert(await page.evaluate(() => window.GWED.pack().stages[0].levels.length) === 2, 'Pack tab adds a new level');

  await pickTool(page, 'deadzone-poly');
  await tapWorld(page, 200, 200);
  await tapWorld(page, 500, 240);
  await tapWorld(page, 360, 520);
  await page.click('#ed-tool-done');
  await page.waitForTimeout(120);
  fx = await fixtures(page);
  const poly = findFixture(fx, 'deadZone');
  assert(poly.fx && poly.fx.shape === 'poly' && poly.fx.points.length === 3,
    'the polygon tool closes a 3-point dead zone');

  await pickTool(page, 'belt');
  await dragWorld(page, { x: 120, y: 800 }, { x: 780, y: 900 });
  await page.waitForTimeout(150);
  lv = await level(page);
  const belts = (lv.editor && lv.editor.belts) || [];
  const rocks = (lv.fixtures || []).filter((f) => f.type === 'obstacle').length;
  assert(belts.length === 1 && rocks > 1,
    'the belt brush expands a stroke into ' + rocks + ' rocks with re-rollable metadata');
  const seedBefore = belts[0].seed;
  await page.click('#tab-inspect');
  await page.click('#insp-belt-reroll');
  await page.waitForTimeout(150);
  lv = await level(page);
  assert(lv.editor.belts[0].seed === seedBefore + 1, 'Re-roll bumps the belt seed and regenerates the rocks');

  // duplicate + delete the polygon zone through the Inspect buttons
  fx = await fixtures(page);
  const polyIndex = fx.findIndex((f) => f.type === 'deadZone');
  await selectFixture(page, polyIndex);
  const beforeDup = (await fixtures(page)).length;
  await page.click('#insp-duplicate');
  await page.waitForTimeout(120);
  assert((await fixtures(page)).length === beforeDup + 1, 'Duplicate copies the selected object');
  await page.click('#insp-delete');
  await page.waitForTimeout(120);
  assert((await fixtures(page)).length === beforeDup, 'Delete removes it again');

  // deleting a LEVEL must ask first
  await page.click('#tab-pack');
  await page.click('#pk-levels .ed-item:nth-child(2) button[aria-label="Delete level"]');
  await page.waitForTimeout(120);
  assert(await page.isVisible('#ed-confirm'), 'deleting a level asks for confirmation');
  await page.click('#ed-confirm-cancel');
  await page.waitForTimeout(120);
  assert(await page.evaluate(() => window.GWED.pack().stages[0].levels.length) === 2, 'cancelling keeps the level');
  await page.click('#pk-levels .ed-item:nth-child(2) button[aria-label="Delete level"]');
  await page.waitForTimeout(120);
  await page.click('#ed-confirm-ok');
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.GWED.pack().stages[0].levels.length) === 1, 'confirming deletes the level');

  // ---- two-finger pinch zooms the camera
  const scaleBefore = await page.evaluate(() => window.GWED.view.scale);
  await page.evaluate(() => {
    const c = document.getElementById('ed-canvas');
    const r = c.getBoundingClientRect();
    const mid = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const fire = (type, id, x, y) => {
      c.dispatchEvent(new PointerEvent(type, {
        pointerId: id, pointerType: 'touch', isPrimary: id === 1,
        clientX: x, clientY: y, bubbles: true, cancelable: true
      }));
    };
    fire('pointerdown', 1, mid.x - 40, mid.y);
    fire('pointerdown', 2, mid.x + 40, mid.y);
    fire('pointermove', 1, mid.x - 120, mid.y);
    fire('pointermove', 2, mid.x + 120, mid.y);
    fire('pointerup', 1, mid.x - 120, mid.y);
    fire('pointerup', 2, mid.x + 120, mid.y);
  });
  await page.waitForTimeout(120);
  const scaleAfter = await page.evaluate(() => window.GWED.view.scale);
  assert(scaleAfter > scaleBefore * 1.5,
    'a two-finger spread zooms in (' + scaleBefore.toFixed(2) + ' -> ' + scaleAfter.toFixed(2) + ')');

  // ---- "Play this pack" hands the pack to the game
  await page.screenshot({ path: path.join(SHOT_DIR, 'ed-' + vp.name + '-final.png') });
  await page.click('#tab-pack');
  await page.click('#pk-play');
  await page.waitForTimeout(600);
  const handed = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('gw.packs') || '[]'); } catch (e) { return []; }
  });
  assert(handed.length === 1 && handed[0].id === 'my-pack' && handed[0].format === 'gw-pack-1',
    '"Play this pack" writes the canonical pack into the game\'s pack list');
  assert(/index\.html$/.test(page.url()) || /gravity-well\/?$/.test(page.url()),
    'and opens the game (' + page.url().split('/').slice(-1)[0] + ')');

  await context.close();
  if (problems.length) throw new Error(vp.name + ' had page problems:\n  - ' + problems.join('\n  - '));
  console.log('  -- no console errors');
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { chromium } = await loadPlaywright();
  const { server, port } = await startServer();
  const baseURL = 'http://127.0.0.1:' + port;
  console.log('serving ' + REPO_ROOT + ' at ' + baseURL);
  const browser = await chromium.launch();
  let failure = null;
  try {
    for (const vp of VIEWPORTS) await runViewport(browser, vp, baseURL);
  } catch (err) {
    failure = err;
  } finally {
    await browser.close();
    server.close();
  }
  if (failure) {
    console.error('\nEDITOR SMOKE TEST FAILED\n' + (failure.stack || failure.message));
    process.exitCode = 1;
    return;
  }
  console.log('\nEDITOR SMOKE TEST PASSED — screenshots in ' + SHOT_DIR);
}

main();
