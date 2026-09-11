// Gravity Well — test/campaign.e2e.mjs
// Plays the WHOLE campaign in a real browser: for every level in LEVELS it
// opens the level, loads the authored `solution` through the game's own "Paste
// solution" path, launches at 2x and asserts the result overlay says the ship
// reached the target. Nothing here knows anything about individual levels, so
// it keeps working as levels.js grows.
//
//   node gravity-well/test/campaign.e2e.mjs
//   node gravity-well/test/campaign.e2e.mjs --level w4-1      (one level)
//
// It also covers the stage-4 PWA plumbing: manifest.webmanifest and sw.js must
// be served 200, navigator.serviceWorker.ready must resolve, and after a reload
// the page must be controlled by the worker.
//
// Playwright is a dev-only dependency and is NOT vendored into the repo; it is
// resolved from a local node_modules or the global npm root, exactly as in
// test/ui.smoke.mjs.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PHYSICS_VERSION } from '../sim.js';
import { LEVELS } from '../levels.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');

const VIEWPORT = { width: 390, height: 844 };
const LEVEL_TIMEOUT = 100000;      // ms to wait for one flight to resolve
const IGNORED_CONSOLE = [/favicon/i];

// --level <id> runs a single level (substring match on the id).
const only = (function () {
  const i = process.argv.indexOf('--level');
  return i >= 0 ? process.argv[i + 1] : null;
})();

// --------------------------------------------------------------- playwright

function unwrap(mod) {
  if (mod && mod.chromium) return mod;
  if (mod && mod.default && mod.default.chromium) return mod.default;
  return mod;
}

async function loadPlaywright() {
  try {
    return unwrap(await import('playwright'));
  } catch (e) { /* fall through to the global lookup */ }
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

// The exact code main.js's Paste button accepts: gw-1|levelId|x,y,n;x,y,n
function encodeSolution(level) {
  const fmt = (n) => String(Math.round(n * 1000) / 1000);
  const parts = level.solution.map((w) => fmt(w.x) + ',' + fmt(w.y) + ',' + w.charges);
  return PHYSICS_VERSION + '|' + level.id + '|' + parts.join(';');
}

// Prefer the debug surface; fall back to unlocking everything in localStorage
// and clicking the row, so the test survives main.js dropping GW.openLevel.
async function enterLevel(page, index, level) {
  const viaDebug = await page.evaluate(
    (i) => {
      if (!window.GW || typeof window.GW.openLevel !== 'function') return false;
      window.GW.openLevel(i);
      return true;
    },
    index
  );
  if (!viaDebug) {
    await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('gw.progress');
        const p = raw ? JSON.parse(raw) : {};
        p.completed = p.completed || {};
        for (const lv of window.__GW_IDS) p.completed[lv] = true;
        localStorage.setItem('gw.progress', JSON.stringify(p));
      } catch (e) { /* private mode */ }
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!window.GW, null, { timeout: 10000 });
    await page.locator('.level-row').nth(index).click();
  }
  await page.waitForFunction(() => window.GW.mode === 'plan', null, { timeout: 10000 });
  const id = await page.evaluate(() => window.GW.level.id);
  if (id !== level.id) throw new Error('opened ' + id + ' but expected ' + level.id);
}

async function playLevel(page, index, level) {
  if (!level.solution || !level.solution.length) {
    throw new Error(level.id + ' has no authored solution to play');
  }
  await enterLevel(page, index, level);

  // The radio card sits over the top bar; dismiss it so nothing is obscured.
  if (await page.isVisible('#radio')) {
    await page.click('#radio');
    await page.waitForTimeout(60);
  }

  // Load the authored solution through the game's own paste path.
  const code = encodeSolution(level);
  await page.evaluate((text) => { window.prompt = () => text; }, code);
  await page.click('#btn-paste');
  try {
    await page.waitForFunction(
      (n) => window.GW.wells.length === n,
      level.solution.length,
      { timeout: 5000 }
    );
  } catch (e) {
    const toast = await page.textContent('#toast').catch(() => '');
    throw new Error(level.id + ': solution code rejected (' + code + ') toast="' + (toast || '') + '"');
  }

  const started = Date.now();
  await page.click('#btn-launch');
  await page.waitForFunction(() => window.GW.mode === 'flight', null, { timeout: 5000 });
  await page.click('#btn-speed');   // 2x, so long drifts still resolve promptly

  await page.waitForSelector('#result:not([hidden])', { timeout: LEVEL_TIMEOUT });
  const elapsed = Date.now() - started;

  const outcome = await page.evaluate(() => {
    const card = document.querySelector('#result .result-card');
    return {
      win: !!(card && card.classList.contains('win')),
      title: (document.getElementById('result-title').textContent || '').trim(),
      body: (document.getElementById('result-body').textContent || '').trim(),
      mode: window.GW.mode
    };
  });

  if (!outcome.win) {
    throw new Error(level.id + ' (' + level.name + ') lost: ' + outcome.title + ' — ' + outcome.body);
  }
  if (outcome.mode !== 'result') {
    throw new Error(level.id + ' did not reach the result state');
  }
  return { elapsed, body: outcome.body };
}

// ------------------------------------------------------------------ the run

async function main() {
  const { chromium } = await loadPlaywright();
  const { server, port } = await startServer();
  const baseURL = 'http://127.0.0.1:' + port;
  console.log('serving ' + REPO_ROOT + ' at ' + baseURL);

  const levels = LEVELS.map((lv, i) => ({ lv, i }))
    .filter(({ lv }) => !only || lv.id.indexOf(only) !== -1);
  if (!levels.length) throw new Error('no levels matched' + (only ? ' --level ' + only : ''));

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    problems.push('console.error: ' + text);
  });
  page.on('pageerror', (err) => problems.push('pageerror: ' + (err && err.message ? err.message : String(err))));

  const results = [];
  let failure = null;
  try {
    // ---- PWA plumbing ------------------------------------------------
    console.log('\n== PWA shell ==');
    const manifestRes = await context.request.get(baseURL + '/gravity-well/manifest.webmanifest');
    assert(manifestRes.status() === 200, 'manifest.webmanifest is served 200');
    const manifest = JSON.parse(await manifestRes.text());
    assert(manifest.name === 'Gravity Well' && manifest.start_url === './',
      'manifest names the app and starts at ./');
    assert((manifest.icons || []).some((i) => i.purpose === 'maskable'),
      'manifest declares a maskable icon');
    for (const icon of manifest.icons || []) {
      const r = await context.request.get(baseURL + '/gravity-well/' + icon.src);
      assert(r.status() === 200, 'icon ' + icon.src + ' is served 200');
    }
    const swRes = await context.request.get(baseURL + '/gravity-well/sw.js');
    assert(swRes.status() === 200, 'sw.js is served 200');

    await page.goto(baseURL + '/gravity-well/', { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.GW, null, { timeout: 10000 });
    await page.evaluate(() => { try { localStorage.removeItem('gw.progress'); } catch (e) {} });

    const ready = await page.evaluate(() => Promise.race([
      navigator.serviceWorker.ready.then((reg) => !!(reg && (reg.active || reg.installing))),
      new Promise((res) => setTimeout(() => res(false), 15000))
    ]));
    assert(ready === true, 'navigator.serviceWorker.ready resolves in the page');

    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!window.GW, null, { timeout: 10000 });
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    assert(controlled === true, 'after a reload the page is controlled by the service worker');

    // ids for the localStorage fallback path in enterLevel()
    await page.evaluate((ids) => { window.__GW_IDS = ids; }, LEVELS.map((lv) => lv.id));

    // ---- the campaign -------------------------------------------------
    console.log('\n== campaign (' + levels.length + ' level' + (levels.length === 1 ? '' : 's') + ') ==');
    for (const { lv, i } of levels) {
      const r = await playLevel(page, i, lv);
      results.push({ id: lv.id, name: lv.name, ms: r.elapsed });
      console.log('  win  ' + lv.id.padEnd(8) + (lv.name || '').padEnd(24) +
        String(r.elapsed).padStart(6) + ' ms   ' + r.body);
    }
  } catch (err) {
    failure = err;
  } finally {
    await context.close();
    await browser.close();
    server.close();
  }

  if (results.length) {
    const total = results.reduce((a, r) => a + r.ms, 0);
    const slowest = results.slice().sort((a, b) => b.ms - a.ms)[0];
    console.log('\n' + results.length + '/' + levels.length + ' levels won in ' +
      (total / 1000).toFixed(1) + 's wall clock (slowest ' + slowest.id + ' at ' +
      (slowest.ms / 1000).toFixed(1) + 's)');
  }

  if (failure) {
    console.error('\nCAMPAIGN E2E FAILED\n' + failure.message);
    if (problems.length) console.error('page problems:\n  - ' + problems.join('\n  - '));
    process.exitCode = 1;
    return;
  }
  if (problems.length) {
    console.error('\nCAMPAIGN E2E FAILED — page problems:\n  - ' + problems.join('\n  - '));
    process.exitCode = 1;
    return;
  }
  console.log('CAMPAIGN E2E PASSED — no console errors');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
