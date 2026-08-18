import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const GAME = path.resolve('idle-pachinko-shootout');
const ENTRY = 'engine-v121-loader.js';
const OUT = path.join(GAME, 'engine-v130.js');
let captured = null;
let functionCount = 0;

function readLocal(url) {
  const clean = String(url).split('?')[0].replace(/^\.\//, '');
  const file = path.join(GAME, clean);
  if (!fs.existsSync(file)) throw new Error(`flatten fetch target missing: ${clean}`);
  return fs.readFileSync(file, 'utf8');
}

const sandbox = {
  console,
  Promise,
  performance: { now: () => 0 },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  document: {
    getElementById() {
      return { className: '', textContent: '' };
    }
  },
  window: {}
};
const context = vm.createContext(sandbox);
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.fetch = async function fetchLocal(url) {
  const text = readLocal(url);
  return { ok: true, status: 200, text: async () => text };
};

sandbox.Function = function FlattenFunction(...args) {
  const body = String(args.pop() || '');
  const params = args.map(String);
  functionCount++;

  // The nested loaders eventually compile the real game runtime. Capture that
  // source instead of executing it in this build-time DOM-less context.
  if (body.includes("var C=document.getElementById('board')") &&
      body.includes('window.__ipsAPI')) {
    captured = body.replace(/\n?\/\/# sourceURL=.*$/m, '').trimEnd() + '\n';
    return function capturedRuntime() {};
  }

  const wrapped = `(function(${params.join(',')}){\n${body}\n})`;
  return new vm.Script(wrapped, { filename: `flatten-loader-${functionCount}.js` })
    .runInContext(context);
};

const top = fs.readFileSync(path.join(GAME, ENTRY), 'utf8');
new vm.Script(top, { filename: ENTRY }).runInContext(context);

const deadline = Date.now() + 5000;
while (!captured && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 10));
}
if (!captured) throw new Error('flatten failed: final engine source was never captured');

captured = captured
  .replace(/version:'1\.11\.7'/g, "version:'1.13.0'")
  .replace(/version:'1\.11\.4'/g, "version:'1.13.0'");

if (/fetch\(['"]engine-v/.test(captured)) {
  throw new Error('flatten failed: engine still contains loader fetches');
}
if (/replaceFunction\(|mustReplace\(/.test(captured)) {
  throw new Error('flatten failed: patch compiler leaked into runtime');
}
new vm.Script(captured, { filename: 'engine-v130.js' });

const banner = `/* Idle Pachinko Shootout v1.13.0 — flattened static engine.\n` +
  ` * Generated from the v1.12.2 runtime chain by tools/flatten-engine.mjs.\n` +
  ` * Do not hand-edit generated output; update source/runtime logic and regenerate.\n` +
  ` */\n`;
fs.writeFileSync(OUT, banner + captured);
console.log(`flattened ${functionCount} generated Function layers -> ${OUT}`);
console.log(`static engine bytes: ${fs.statSync(OUT).size}`);
