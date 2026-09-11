// Gravity Well — tools/make-icons.js
// Regenerates gravity-well/icons/* from one inline vector description.
//
//   node gravity-well/tools/make-icons.js
//
// The artwork is defined once below (buildSVG) and rasterised by Playwright's
// chromium, which is a DEV-ONLY dependency exactly like test/ui.smoke.mjs — the
// game itself ships the committed PNGs and has no npm dependencies at all. The
// script also writes icons/icon.svg, which is the source of truth used as the
// favicon, so the SVG and the PNGs can never drift apart.
//
// Variants:
//   rounded   dark navy rounded square (icon.svg, icon-192.png, icon-512.png)
//   square    full-bleed, art at 0.92 (apple-touch-icon.png — iOS masks it)
//   maskable  full-bleed, art at 0.68 so every pixel of it sits inside the
//             central 80% safe circle (icon-512-maskable.png)

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICON_DIR = path.resolve(HERE, '..', 'icons');

// In-game palette (style.css / render.js COLORS).
const C = {
  plateTop: '#0b1428',
  plateBottom: '#04060e',
  well: '#9b6cff',
  wellCore: '#120a24',
  wellRim: '#c9a7ff',
  ship: '#4fe3d0',
  star: '#cfe0ff'
};

// Art centre + scale used to fit the drawing inside a maskable safe zone.
const ART_CX = 272;
const ART_CY = 280;

function art() {
  return [
    // gravitational halo
    '<circle cx="300" cy="296" r="150" fill="url(#halo)"/>',
    // a few stars
    '<circle cx="96" cy="120" r="4" fill="' + C.star + '" opacity=".55"/>',
    '<circle cx="158" cy="74" r="3" fill="' + C.star + '" opacity=".35"/>',
    '<circle cx="434" cy="392" r="3.5" fill="' + C.star + '" opacity=".40"/>',
    '<circle cx="392" cy="446" r="2.5" fill="' + C.star + '" opacity=".30"/>',
    // the well: a ring pair around a dark lethal core
    '<circle cx="300" cy="296" r="122" fill="none" stroke="' + C.well + '" stroke-opacity=".40" stroke-width="9"/>',
    '<circle cx="300" cy="296" r="80" fill="none" stroke="' + C.well + '" stroke-opacity=".85" stroke-width="14"/>',
    '<circle cx="300" cy="296" r="34" fill="' + C.wellCore + '" stroke="' + C.wellRim + '" stroke-width="7"/>',
    // the ship's trajectory, bending around the well
    '<path d="M 88 452 C 148 332 188 252 264 208 C 320 176 362 160 404 150" ' +
      'fill="none" stroke="' + C.ship + '" stroke-opacity=".95" stroke-width="15" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>',
    // the ship itself, a wedge on the tangent
    '<g transform="translate(444,134) rotate(-14)">' +
      '<path d="M 34 0 L -22 -22 L -10 0 L -22 22 Z" fill="' + C.ship + '"/>' +
    '</g>'
  ].join('\n    ');
}

function buildSVG(variant) {
  const radius = variant === 'rounded' ? 112 : 0;
  const scale = variant === 'maskable' ? 0.68 : (variant === 'square' ? 0.92 : 1);
  // A non-unit scale also moves the art's own centre to the canvas centre.
  const centred = scale === 1
    ? '<g>'
    : '<g transform="translate(256,256) scale(' + scale + ') translate(' + (-ART_CX) + ',' + (-ART_CY) + ')">';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" ' +
    'role="img" aria-label="Gravity Well">\n' +
    '  <defs>\n' +
    '    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">\n' +
    '      <stop offset="0" stop-color="' + C.plateTop + '"/>\n' +
    '      <stop offset="1" stop-color="' + C.plateBottom + '"/>\n' +
    '    </linearGradient>\n' +
    '    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">\n' +
    '      <stop offset="0" stop-color="' + C.well + '" stop-opacity="0.5"/>\n' +
    '      <stop offset="1" stop-color="' + C.well + '" stop-opacity="0"/>\n' +
    '    </radialGradient>\n' +
    '  </defs>\n' +
    '  <rect x="0" y="0" width="512" height="512" rx="' + radius + '" ry="' + radius + '" fill="url(#plate)"/>\n' +
    '  ' + centred + '\n    ' + art() + '\n  </g>\n' +
    '</svg>\n';
}

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

// ------------------------------------------------------------------- render

const OUTPUTS = [
  { file: 'icon-192.png', size: 192, variant: 'rounded' },
  { file: 'icon-512.png', size: 512, variant: 'rounded' },
  { file: 'icon-512-maskable.png', size: 512, variant: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, variant: 'square' }
];

async function main() {
  fs.mkdirSync(ICON_DIR, { recursive: true });

  const svgPath = path.join(ICON_DIR, 'icon.svg');
  fs.writeFileSync(svgPath, buildSVG('rounded'));
  console.log('wrote ' + svgPath);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  try {
    for (const out of OUTPUTS) {
      const page = await browser.newPage({
        viewport: { width: out.size, height: out.size },
        deviceScaleFactor: 1
      });
      const svg = buildSVG(out.variant)
        .replace('width="512" height="512"', 'width="' + out.size + '" height="' + out.size + '"');
      await page.setContent(
        '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}' +
        'svg{display:block}</style>' + svg
      );
      const file = path.join(ICON_DIR, out.file);
      await page.screenshot({ path: file, omitBackground: true });
      await page.close();
      console.log('wrote ' + file + '  (' + out.size + 'px, ' + out.variant + ')');
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exitCode = 1;
});
