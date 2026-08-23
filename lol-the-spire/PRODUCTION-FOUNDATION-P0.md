# Lane Warden — P0 Production Foundation

**Build:** `P0-0.10.5`  
**Active product scope:** `/lol-the-spire/lane-warden-prod-v0.10.4/`  
**Status:** PLAYABLE FOUNDATION · SELF-UPDATING PWA  
**Design baseline:** 1.7

## What is real now

This build is the first Lane Warden runtime that owns production behavior directly rather than importing or wrapping a historical R01/R02/Test harness.

Implemented end-to-end seam:

`new run → Act 1 map → two-lane deployment → battle → victory or Last Stand → node resolution → persisted return to map`

Production-owned systems include:

- deterministic run seed;
- local run persistence;
- data definitions for The Warden, five starting lane units, four starting towers, and the visible Act 1 node skeleton;
- two-lane Act 1 battle with no Rival Commander;
- Commander Presence and lane relocation;
- Rally, Sunder, Waypoint, Conscript;
- Bastion → regenerating Guard → Gate vulnerability progression;
- shared Core;
- Test 7 contextual battlefield information policy;
- Test 8-style phone control hierarchy;
- normal victory;
- payable Bulwark Detonation Last Stand;
- terminal Last Stand rules;
- production PWA/service-worker update lifecycle;
- lightweight invariant self-check.

## PWA update policy

Beginning with `P0-0.10.5`, the active production scope is designed to update in place rather than requiring new install URLs for ordinary patches.

- `build.json` is fetched with `cache: no-store` on launch, `pageshow`, and foreground return;
- the service-worker registration uses `updateViaCache: none`;
- a new worker precaches the new build using reload semantics;
- installation uses `skipWaiting()`;
- activation deletes older Lane Warden production caches and uses `clients.claim()`;
- navigation is network-first with an offline cached-shell fallback;
- the page listens for `controllerchange` and performs one controlled reload when the new worker takes control;
- if a worker update lands during an active battle, it may download and activate immediately, but page reload is deferred until the player leaves the battle/resolution seam;
- run persistence remains outside the application cache, so a shell update does not intentionally clear the run;
- the home screen exposes `APP / LATEST / SW` build identities for update diagnosis.

For each production release, `build.json`, `sw.js`, and versioned asset URLs must advance together.

## Deliberately provisional

### Protected reading

The first candidate is now integrated into the real product shell:

- opening the action/structure reading surface slows simulation to 35%;
- a shared 4.0-second reserve drains while protected reading is active;
- the reserve slowly recharges only while the reading surface is closed;
- when the reserve is exhausted, the tactical clock returns to full speed even if the menu remains open.

This mechanism is **not validated yet**. It is the next human-use question.

### Content / map

Only `Outer Approach` is implemented as a resolvable production node. The visible Forge, second Battle, and Gatekeeper nodes are locked route-shape placeholders for P2/P3 and must not be treated as implemented content.

### Art / encounter quality

The current battle renderer is first-pass production-owned presentation used to prove code/state ownership. It is not the final visual pipeline, final encounter tuning, or production art lock.

## Immediate next work

1. Confirm the self-updating production shell installs and reports matching APP / LATEST / SW build identity on the target phone.
2. Human-test the finite protected-reading candidate inside this production build.
3. Fix any remaining P0 integration defects found on the target phone.
4. Promote the battle slice toward P1 quality: better deployment controls, actual structure selection, authored encounter pressure, Reclamation, and production asset integration.
5. Begin the parallel representative asset set from the production roadmap.

Historical Test 0–10 evidence remains preserved and is not modified by this build.
