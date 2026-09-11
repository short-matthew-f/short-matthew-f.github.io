# Gravity Well

Your engine is dead. You cannot steer — you can only place gravity charges on
the board, launch, and watch the field do the turning. A deterministic
space-physics puzzle: same placement, same flight, every time.

Static files only — vanilla ES modules and Canvas 2D, no build step, no
bundler, **no runtime dependencies**. It ships as an installable PWA, so on a
phone it can be added to the home screen and played offline.

Live: <https://short-matthew-f.github.io/gravity-well/>

```
index.html            entry document (menu view + play view in one page)
style.css             dark space palette, mobile-first, safe-area aware
sim.js                pure deterministic simulation (no DOM)
levels.js             the campaign: WORLDS + LEVELS
render.js             canvas drawing
input.js              pointer gestures (tap / double-tap / drag)
main.js               app state machine, DOM glue, service worker + install
manifest.webmanifest  PWA manifest
sw.js                 service worker (app-shell cache)
icons/                PWA icons + icon.svg source
test/                 node --test suites and two Playwright scripts
tools/                hot-zone analysis, icon generation
```

## Run locally

The game must be served over HTTP (ES modules and the service worker both
refuse `file://`). Anything static works, from the **repository root** — the
site is a GitHub Pages user site, so the repo root is the site root:

```sh
python3 -m http.server 8000
# or
npx http-server -p 8000
```

Then open <http://127.0.0.1:8000/gravity-well/>.

`127.0.0.1` counts as a secure origin, so the service worker and the install
prompt both work locally. If a stale worker gets in the way while developing,
use a private window or DevTools → Application → Service Workers → Unregister.

## Tests

Unit / level tests (node's built-in runner, no dependencies):

```sh
node --test gravity-well/test/*.test.js
```

Browser tests. These use Playwright, which is a **dev-only** dependency and is
deliberately not vendored into the repo; both scripts resolve it from a local
`node_modules` or the global npm root (`npm i -g playwright`, or
`npm i --no-save playwright` outside the repo):

```sh
node gravity-well/test/ui.smoke.mjs        # gestures, launch, result overlay
node gravity-well/test/campaign.e2e.mjs    # every level, played to a win
```

`ui.smoke.mjs` drives the real page at 390x844 and 1280x800 and writes
screenshots. `campaign.e2e.mjs` walks **every** level in `LEVELS`, loads that
level's authored `solution` through the game's own "Paste solution" path,
launches at 2x and asserts the win, reporting per-level timing; it also checks
that `manifest.webmanifest` and `sw.js` are served, and that the page is
controlled by the service worker after a reload. Both fail on any console
error. Single level:

```sh
node gravity-well/test/campaign.e2e.mjs --level w4-1
```

## Bumping the service worker cache

`sw.js` precaches the app shell under a versioned cache name. After changing
**any** shell file (html/css/js/manifest/icons), bump the version at the top of
`sw.js`:

```js
var CACHE_VERSION = 1;   // -> 2
```

That is the entire update mechanism: a new cache (`gw-v2`) is filled on install,
every older `gw-v*` cache is deleted on activate, and `clients.claim()` means
the next navigation is already served by the new worker. Shipping without the
bump is not fatal — navigations and JS/CSS are network-first — but icons are
cache-first and will go stale.

## Icons

`icons/` is generated; do not hand-edit it. The artwork is one inline vector
description in `tools/make-icons.js`, rasterised by Playwright's chromium:

```sh
node gravity-well/tools/make-icons.js
```

This rewrites `icons/icon.svg` (the favicon and the source of truth) plus
`icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (art scaled into the
central 80% safe zone) and `apple-touch-icon.png`. Bump the SW cache version
afterwards.

## Levels

The level format — bounds, charge budget, fixtures, radio, `solution` — is
documented in the SPEC comments at the top of `levels.js`; each level also
carries a `// design:` note explaining what it teaches.

Levels are not eyeballed, they are measured. `tools/hotzone.js` sweeps a well
across the board and reports how much of it wins:

```sh
node gravity-well/tools/hotzone.js all                 # every level, summary
node gravity-well/tools/hotzone.js w1-1 --ascii        # ASCII win map
node gravity-well/tools/hotzone.js w4-1 --step 8       # finer lattice
node gravity-well/tools/hotzone.js w4-1 --random 500   # random-config win rate
```

For each charge count it prints the winning area and the number of distinct
4-connected winning regions, plus the **tolerance radius** of each authored
well: the largest disc around the authored position that still wins. The level
test enforces that this radius clears the phase floor (60 units in World 1 down
to 25 in the late worlds), so no level is a pixel hunt.
