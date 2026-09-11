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
campaign.js           the campaign exposed as a pack (CAMPAIGN_PACK)
packs.js              pack loading / import / per-pack progress
render.js             canvas drawing
input.js              pointer gestures (tap / double-tap / drag)
main.js               app state machine, DOM glue, service worker + install
editor.html           level editor page
editor/               the editor: state, canvas, panel, tools, analysis worker
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
node gravity-well/test/editor.smoke.mjs    # the level editor, end to end
```

`ui.smoke.mjs` and `editor.smoke.mjs` drive the real pages at 390x844 and
1280x800 and write screenshots; `editor.smoke.mjs` builds a level out of the
palette, exports it, imports it back and asserts the JSON is byte identical,
runs Lint in the worker and takes the Test flight there and back. `campaign.e2e.mjs` walks **every** level in `LEVELS`, loads that
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

## Level editor

Open it from the game menu ("Level editor") or go straight to
<http://127.0.0.1:8000/gravity-well/editor.html>. It is the same static-file
deal as the game: vanilla modules, no build, works on a phone.

The board fills the viewport. Drag empty space to pan, pinch or scroll to zoom,
tap a palette tool and then tap the board to place — whatever you place is
selected immediately, so its numbers are one tab away. Handles do the rest:
drag the body to move, the round handle to resize, the ship's arrow tip to aim
it, a wormhole's tick to rotate that mouth, path dots to reshape a patrol (tap
a midpoint dot to add one). Desktop also has Delete, Ctrl/Cmd+Z / Shift+Z,
Ctrl/Cmd+D and arrow-key nudges.

The panel is a bottom sheet on a phone and a right sidebar on a desktop:

- **Palette** — ship, target, waypoint; rock / wall / ridge and the belt brush;
  asteroid (drifting or patrolling), drone, hunter, ore, ore depot; fixed well,
  repulsor, wormhole pair; dead and allowed zones as circle, rect or polygon.
- **Inspect** — every field of the selection as a real number/text/checkbox
  input (x, y, r, w, h, vx, vy, speed, loop, charges, order, angle in degrees,
  oneWay, colour, immune, id), plus Duplicate, Delete and a belt's Re-roll.
- **Level** — id, name, optional (★), bounds, charge budget, stack limit,
  preview seconds, min tolerance, designer notes and the authored solution.
- **Tutorial** — the `tutorial.steps` list: when, text, marker (well / point /
  UI button, positioned by tapping the board), once, reorder, delete.
- **Analyse** — the sim-heavy tools, in a Web Worker (see below).
- **Pack** — pack meta, stages and levels (reorder, duplicate, toggle optional,
  delete), Import (paste or file), Export (clipboard **and** a `.json`
  download) and "Play this pack", which hands it to the game and opens it.

**Test round trip.** "Test" writes the level to `gw.editor.testLevel` and the
current solution to `gw.editor.testWells`, then opens `index.html?test=1`,
which plays that level with no progress written and a "Back to editor" button.
On the way back the editor reads `gw.editor.lastTrail` and ghosts the flight
path over the board, and offers the wells you finished with as the level's
solution.

**Analyse** runs `sim.js` and `tools/hotzone.js` inside
`editor/analyse.worker.js` (a module worker), so the board never blocks; every
job reports progress and can be cancelled.

- *Hot zone* — sweep a single well of N charges over a lattice and paint the
  winning cells, with the winning area and the region count.
- *Solution finder* — random search inside the budget, local refinement, then
  clustering into families; each family has Show (wells + predicted path) and
  Use as solution.
- *Tolerance* — the per-well tolerance radius of the authored solution, drawn
  as discs and flagged against the floor.
- *Lint* — ship and target present, unique ids, waypoints numbered 1..n,
  wormholes paired, the solution is legal and wins, zero wells fails, tolerance
  clears the floor, and the headline check: **"Solvable with one well"**, which
  reports the smallest charge count that a single well anywhere can win with.
  That is the warning that keeps a pack from feeling samey.

**Autosave.** The working pack is written to `localStorage` under
`gw.editor.pack` 300 ms after every change (with `gw.editor.cursor` remembering
which stage and level were open) and restored on load, so a reload, a test
flight or a closed tab costs nothing. Undo/redo is a snapshot stack capped at
100 steps, and importing a pack is a single undo step.

**Polygon obstacles are approximate.** `sim.js` collides an `obstacle` as a
circle or an axis-aligned rect, so a `shape:'poly'` obstacle also carries an
`x, y, r` circle fallback (the polygon's centroid and its inscribed radius) and
that is what the physics actually uses. The editor draws the polygon *and*, in
dashed red, the circle it collides as, so the gap is visible rather than a
surprise at launch. Polygon **zones** have no such caveat: dead and allowed
zones are point-in-polygon tested by `validateWells`.

## Level packs

A pack is levels grouped into stages — the format the editor exports and the
game imports:

```js
{
  format: 'gw-pack-1',
  physicsVersion: 'gw-2',      // the game warns if it does not match sim.js
  id: 'my-pack', name: 'My Pack', author: '', version: 1,
  stages: [
    { id: 's1', title: 'Stage title', blurb: 'one line', levels: [ /* … */ ] }
  ]
}
```

A level inside a stage is the ordinary level object (id, name, bounds, charges,
stackLimit, previewSeconds, showBodyPreview, ship, target, fixtures, solution,
minTolerance) plus `optional: true` for a ★ challenge that does not gate
progression. Stage order replaces `phase`; required levels unlock in sequence
within a stage, and a stage's optional levels unlock once its required ones are
done. The built-in campaign is exposed as a pack by `campaign.js`, so the menu
is the same pack ▸ stage ▸ level list for everything.

Alongside the original fixtures (obstacle, asteroid, drone, hunter, ore,
oreReceiver, wormhole), a level may use:

- `deadZone` — `{shape:'circle'|'rect'|'poly', …}`: no well may be placed
  inside it. A placement rule, not physics.
- `allowedZone` — same shapes; if a level has any, every well must sit inside
  one of them.
- `waypoint` — `{id, x, y, r, order}`: the ship must pass the waypoints in
  ascending order before the target counts.
- `well` — `{id, x, y, charges}`: a designer-placed fixed well. Full gravity,
  lethal core, cannot be moved, does not spend the budget.
- `repulsor` — `{id, x, y, charges}`: the same field with the sign flipped. It
  pushes, has no lethal core, and is never consumed.
- moving target — `level.target` may carry `path`, `speed`, `loop`, patrolling
  exactly like a path asteroid.

Player wells must also keep `MIN_WELL_DISTANCE` from fixed wells and repulsors;
`sim.validateWells` is the single authority for all of these rules and returns
a reason (`deadzone`, `allowed`, `spacing`, `budget`, `stack`, `bounds`).

Tutorials are authored as `tutorial: { steps: [ {when, text, marker, once} ] }`,
which supersedes the old `radio` + `hint` pair; the game still reads `radio` and
`hint` on older levels.

**Importing.** In the game: menu → "Import pack" → paste the JSON or choose a
file. Imported packs live in `localStorage` under `gw.packs` and appear in the
pack picker next to the campaign, each with a remove button (which asks first,
since it drops that pack's progress too). The editor's "Play this pack" does
the same write for you. Progress is stored per pack under
`gw.progress.<packId>`, so an imported pack never touches the campaign's.
