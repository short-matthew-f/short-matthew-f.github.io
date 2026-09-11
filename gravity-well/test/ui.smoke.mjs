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

  // Start from a clean slate so level 1 is the first unlocked row.
  await page.evaluate(() => { try { localStorage.removeItem('gw.progress'); } catch (e) {} });
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
