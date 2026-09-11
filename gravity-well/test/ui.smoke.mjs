// Gravity Well — test/ui.smoke.mjs
// End-to-end smoke test: serves the repo root over plain node:http, then drives
// the real page in Chromium at a phone and a desktop viewport. Exercises the
// full planning gesture set (tap to place, drag to move, double-tap to delete)
// and a launch through to the result overlay. Any console error or pageerror
// fails the run.
//
//   node gravity-well/test/ui.smoke.mjs
//
// Playwright is a dev-only dependency and is NOT vendored into the repo. The
// loader below picks it up from a local node_modules or from the global npm
// root; if neither has it, install it outside the repo:
//   npm i --no-save playwright

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

// A throwaway level whose ship starts outside the bounds rect on both axes and
// flies back in, so the dynamic camera has to open up in either viewport.
const CAMERA_LEVEL = {
  id: 'smoke-camera', name: 'Camera Smoke', phase: 1, optional: false,
  bounds: { w: 900, h: 1200 },
  charges: 1, stackLimit: 1, previewSeconds: 0, showBodyPreview: false,
  ship: { x: -110, y: -110, vx: 40, vy: 40 },
  target: { x: 450, y: 450, r: 28 },
  fixtures: [], radio: [], hint: null, solution: []
};

// A throwaway level with room for three charges, used to check that a tap
// inside a well's exclusion zone grows that well instead of placing a new one.
const SPACING_LEVEL = {
  id: 'smoke-spacing', name: 'Spacing Smoke', phase: 1, optional: false,
  bounds: { w: 900, h: 1200 },
  charges: 3, stackLimit: 3, previewSeconds: 0, showBodyPreview: false,
  ship: { x: 450, y: 1100, vx: 0, vy: -160 },
  target: { x: 450, y: 120, r: 28 },
  fixtures: [], radio: [], hint: null, solution: []
};

// A tiny importable pack, used to exercise the pack picker end to end.
const IMPORT_PACK = {
  format: 'gw-pack-1',
  physicsVersion: 'gw-2',
  id: 'smoke-pack', name: 'Smoke Pack', author: 'tests', version: 1,
  stages: [{
    id: 'st1', title: 'Only Stage', blurb: 'one level',
    levels: [{
      id: 'sp-1', name: 'Imported One', bounds: { w: 900, h: 1200 },
      charges: 2, stackLimit: 2, previewSeconds: 0, showBodyPreview: false,
      ship: { x: 450, y: 1100, vx: 0, vy: -160 },
      target: { x: 450, y: 120, r: 28 },
      fixtures: [], radio: [], solution: []
    }]
  }]
};

// Handed to the page through localStorage the way the editor's Test button does.
const TEST_MODE_LEVEL = {
  id: 'editor-test', name: 'Editor Test', bounds: { w: 900, h: 1200 },
  charges: 2, stackLimit: 2, previewSeconds: 6, showBodyPreview: false,
  ship: { x: 450, y: 1100, vx: 0, vy: -160 },
  target: { x: 450, y: 200, r: 28 },
  fixtures: [], radio: [], solution: []
};

// Stage 4 adds manifest.webmanifest / icons; until then the 404 is expected and
// is the only console noise we tolerate.
const IGNORED_CONSOLE = [/manifest/i, /favicon/i];

// --------------------------------------------------------------- playwright

function unwrap(mod) {
  // A CJS build imported through ESM lands under `default`.
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
  '.ico': 'image/x-icon'
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

function charges(page) {
  return page.textContent('#charges-used');
}

// World point -> canvas/page coordinates, read live from the app.
function worldToPage(page, wx, wy) {
  return page.evaluate(([x, y]) => {
    const v = window.GW.view;
    const rect = document.getElementById('game').getBoundingClientRect();
    return { x: rect.left + x * v.scale + v.ox, y: rect.top + y * v.scale + v.oy };
  }, [wx, wy]);
}

async function tap(page, pt) {
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.mouse.up();
}

// ---------------------------------------------------------------- the run

async function runViewport(browser, vp, baseURL) {
  console.log('\n== ' + vp.name + ' ==');
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
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
    problems.push('requestfailed: ' + req.url());
  });

  await page.goto(baseURL + '/gravity-well/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.GW, null, { timeout: 10000 });

  // Start from a clean slate so level 1 is the first unlocked row. Progress is
  // per pack now (gw.progress.<packId>), plus the legacy key it migrates from.
  await page.evaluate(() => {
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k === 'gw.progress' || k.indexOf('gw.progress.') === 0 || k === 'gw.packs')) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* private mode */ }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.GW, null, { timeout: 10000 });

  // ---- menu -> level 1
  const rows = page.locator('.level-row');
  assert(await rows.count() > 0, 'level select lists levels');
  assert(await page.locator('.phase-head').count() > 0, 'level select groups levels by world');
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-menu.png') });
  await rows.first().click();
  await page.waitForFunction(() => window.GW.mode === 'plan', null, { timeout: 5000 });
  assert(await page.isVisible('#game'), 'canvas is visible in plan state');
  assert((await charges(page)) === '0', 'charges start at 0');

  // Dismiss the opening radio card so it cannot swallow a tap.
  if (await page.isVisible('#radio')) {
    await page.click('#radio');
    await page.waitForTimeout(120);
  }

  // Aim at a spot the level itself considers interesting so the flight resolves
  // quickly; fall back to a point ahead-and-beside the ship.
  const spot = await page.evaluate(() => {
    const lv = window.GW.level;
    if (lv.hint && lv.hint.well) return { x: lv.hint.well.x, y: lv.hint.well.y };
    if (lv.solution && lv.solution.length) return { x: lv.solution[0].x, y: lv.solution[0].y };
    return {
      x: Math.min(lv.bounds.w - 60, lv.ship.x + 140),
      y: Math.max(60, lv.ship.y - 220)
    };
  });
  const spotPt = await worldToPage(page, spot.x, spot.y);

  // ---- tap empty space: place a well
  await tap(page, spotPt);
  await page.waitForTimeout(120);
  assert((await charges(page)) === '1', 'tap on empty space places a 1-charge well');
  assert(await page.evaluate(() => window.GW.wells.length) === 1, 'one well in the model');
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-plan.png') });

  // ---- drag the well
  const before = await page.evaluate(() => ({ x: window.GW.wells[0].x, y: window.GW.wells[0].y }));
  const from = await worldToPage(page, before.x, before.y);
  const to = { x: from.x + 55, y: from.y - 35 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => ({ x: window.GW.wells[0].x, y: window.GW.wells[0].y }));
  assert(Math.abs(after.x - before.x) > 1 || Math.abs(after.y - before.y) > 1, 'drag moved the well');
  assert((await charges(page)) === '1', 'drag does not change the charge count');
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-dragged.png') });

  // ---- double-tap the well: delete + refund
  await page.waitForTimeout(420); // let any pending single tap expire
  const wellPt = await worldToPage(page, after.x, after.y);
  await tap(page, wellPt);
  await page.waitForTimeout(70);
  await tap(page, wellPt);
  await page.waitForTimeout(150);
  assert((await charges(page)) === '0', 'double-tap deletes the well and refunds the charge');
  assert(await page.evaluate(() => window.GW.wells.length) === 0, 'no wells left in the model');

  // ---- place one again and launch
  await page.waitForTimeout(420);
  await tap(page, spotPt);
  await page.waitForTimeout(120);
  assert((await charges(page)) === '1', 'well placed again before launch');

  await page.click('#btn-launch');
  await page.waitForFunction(() => window.GW.mode === 'flight', null, { timeout: 5000 });
  assert(true, 'launch enters the flight state');
  assert(await page.isVisible('#flight-controls'), 'flight controls are shown');
  assert(await page.isHidden('#plan-controls'), 'plan controls are hidden during flight');
  await page.click('#btn-speed'); // 2x, so a long drift still resolves promptly
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-flight.png') });

  await page.waitForSelector('#result:not([hidden])', { timeout: 70000 });
  const title = (await page.textContent('#result-title')) || '';
  assert(title.length > 0, 'result overlay appeared: "' + title.trim() + '"');
  assert(await page.evaluate(() => window.GW.mode) === 'result', 'app is in the result state');
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-result.png') });

  // ---- back to planning keeps the wells
  await page.click('#btn-adjust');
  await page.waitForFunction(() => window.GW.mode === 'plan', null, { timeout: 5000 });
  assert((await charges(page)) === '1', 'Adjust returns to plan with wells intact');

  // ---- packs: the menu groups by stage and can import / switch / remove
  await page.click('#btn-menu');
  await page.waitForFunction(() => window.GW.mode === 'menu', null, { timeout: 5000 });
  assert(await page.evaluate(() => window.GW.pack.id) === 'campaign', 'the campaign pack is selected by default');
  await page.click('#btn-packs');
  await page.waitForSelector('#packs:not([hidden])', { timeout: 5000 });
  assert(await page.locator('.pack-row').count() === 1, 'only the built-in pack is listed at first');

  await page.click('#btn-import-pack');
  await page.waitForSelector('#import:not([hidden])', { timeout: 5000 });
  await page.evaluate((json) => {
    document.getElementById('import-text').value = JSON.stringify(json);
  }, IMPORT_PACK);
  await page.click('#btn-import-go');
  await page.waitForFunction(() => window.GW.pack.id === 'smoke-pack', null, { timeout: 5000 });
  assert(true, 'importing a pack selects it');
  assert((await page.textContent('#pack-name')).trim() === 'Smoke Pack', 'the menu shows the imported pack name');
  assert(await page.locator('.level-row').count() === 1, 'the imported pack lists its one level');
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-packs.png') });

  const backOk = await page.evaluate(() => window.GW.selectPack('campaign'));
  assert(backOk === true, 'switching back to the campaign works');
  assert(await page.locator('.level-row').count() > 1, 'the campaign levels are listed again');
  const removed = await page.evaluate(() => {
    const raw = localStorage.getItem('gw.packs');
    return raw ? JSON.parse(raw).length : 0;
  });
  assert(removed === 1, 'the imported pack persists in gw.packs');

  // ---- well spacing: a tap inside the exclusion zone grows the nearest well
  await page.evaluate((lv) => window.GW.loadLevel(lv), SPACING_LEVEL);
  await page.waitForFunction(() => window.GW.mode === 'plan', null, { timeout: 5000 });
  const seedPt = await worldToPage(page, 450, 700);
  await tap(page, seedPt);
  await page.waitForTimeout(120);
  assert((await charges(page)) === '1', 'seed well placed for the spacing check');

  await page.waitForTimeout(420); // past the double-tap window
  const nearPt = await worldToPage(page, 450, 760); // 60 world units away
  await tap(page, nearPt);
  await page.waitForTimeout(150);
  const wellCount = await page.evaluate(() => window.GW.wells.length);
  const wellCharges = await page.evaluate(() => window.GW.wells[0].charges);
  assert(wellCount === 1 && wellCharges === 2 && (await charges(page)) === '2',
    'a tap 60u from a well grows it to 2 charges instead of placing a second well');

  // ---- camera: a ship outside the bounds must zoom the view out
  await page.evaluate((lv) => window.GW.loadLevel(lv), CAMERA_LEVEL);
  await page.waitForFunction(() => window.GW.mode === 'plan', null, { timeout: 5000 });
  const baseScale = await page.evaluate(() => window.GW.view.scale);
  assert(baseScale > 0, 'synthetic camera level loaded (base scale ' + baseScale.toFixed(3) + ')');
  await page.click('#btn-launch');
  await page.waitForFunction(() => window.GW.mode === 'flight', null, { timeout: 5000 });
  await page.click('#btn-speed');
  await page.waitForFunction(
    (b) => window.GW.view.scale < b * 0.95,
    baseScale,
    { timeout: 20000 }
  );
  const zoomed = await page.evaluate(() => window.GW.view.scale);
  assert(zoomed < baseScale * 0.95,
    'camera zooms out when the ship is outside the bounds (' +
    baseScale.toFixed(3) + ' -> ' + zoomed.toFixed(3) + ')');
  assert(zoomed >= baseScale / 2.2 - 1e-6, 'zoom-out stays within the 2.2x cap');
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-camera.png') });

  // ---- editor test mode: ?test=1 plays a handed-over level, writes no progress
  await page.evaluate((lv) => {
    localStorage.setItem('gw.editor.testLevel', JSON.stringify(lv));
    localStorage.setItem('gw.editor.testWells', JSON.stringify([{ x: 300, y: 700, charges: 1 }]));
    localStorage.removeItem('gw.editor.lastTrail');
  }, TEST_MODE_LEVEL);
  await page.goto(baseURL + '/gravity-well/?test=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.GW && window.GW.mode === 'plan', null, { timeout: 10000 });
  assert(await page.evaluate(() => window.GW.testMode) === true, 'test mode is active with ?test=1');
  assert(await page.evaluate(() => window.GW.level.id) === 'editor-test', 'test mode loads gw.editor.testLevel');
  assert(await page.evaluate(() => window.GW.wells.length) === 1, 'test mode seeds gw.editor.testWells');
  assert(await page.isVisible('#btn-back-editor'), 'test mode shows a Back to editor link');
  assert((await page.getAttribute('#btn-back-editor', 'href')) === 'editor.html',
    'Back to editor points at editor.html');

  await page.click('#btn-launch');
  await page.waitForFunction(() => window.GW.mode === 'flight', null, { timeout: 5000 });
  await page.click('#btn-speed');
  await page.waitForSelector('#result:not([hidden])', { timeout: 60000 });
  const trail = await page.evaluate(() => {
    const raw = localStorage.getItem('gw.editor.lastTrail');
    return raw ? JSON.parse(raw) : null;
  });
  assert(!!trail && Array.isArray(trail.points) && trail.points.length > 1,
    'the flight trail is written back to gw.editor.lastTrail');
  assert(trail.levelId === 'editor-test' && !!trail.outcome, 'the trail records the level and outcome');
  const wroteProgress = await page.evaluate(() => {
    const raw = localStorage.getItem('gw.progress.campaign');
    const p = raw ? JSON.parse(raw) : { completed: {} };
    return !!(p.completed && p.completed['editor-test']);
  });
  assert(wroteProgress === false, 'test mode never writes progress');
  await page.screenshot({ path: path.join(SHOT_DIR, 'gw-' + vp.name + '-testmode.png') });

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
    console.error('\nSMOKE TEST FAILED\n' + failure.message);
    process.exitCode = 1;
    return;
  }
  console.log('\nSMOKE TEST PASSED — screenshots in ' + SHOT_DIR);
}

main();
