# Lane Warden — P0 Production Foundation

**Build:** `P0-0.10.0`  
**Product root:** `/lol-the-spire/lane-warden/`  
**Status:** PLAYABLE FOUNDATION  
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
- PWA/service worker;
- lightweight invariant self-check.

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

1. Human-test the finite protected-reading candidate inside this production build.
2. Fix any P0 integration defects found on the target phone.
3. Promote the battle slice toward P1 quality: better deployment controls, actual structure selection, authored encounter pressure, Reclamation, and production asset integration.
4. Begin the parallel representative asset set from the production roadmap.

Historical Test 0–10 evidence remains preserved and is not modified by this build.
