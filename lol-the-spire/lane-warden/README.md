# Lane Warden — Production Foundation P0-0.10.1

This is the first production-owned Lane Warden PWA. It does not import or wrap historical Test 0–10 / R01 / R02 runtimes.

## Implemented seam

`new run → Act 1 map → two-lane deployment → production battle → victory or Last Stand → persisted resolution → map`

## Production-owned systems

- deterministic run seed;
- local save/resume after run creation and node resolution;
- data-driven Warden, five starting lane units, four starting towers, map-node definitions;
- Act 1 two-lane battle with no Rival Commander;
- Bastion → Guard → Gate progression;
- shared Core;
- Commander Presence and lane relocation;
- Rally, Sunder, Waypoint, Conscript;
- contextual Guard/Bastion information policy;
- normal victory and payable/terminal Bulwark Detonation resolution;
- finite protected-reading slowdown candidate;
- PWA/service worker;
- lightweight internal invariant check.

## Protected reading candidate

Opening the action/structure reading surface slows battle simulation to 35% only while a shared 4.0-second reserve remains. The reserve recharges slowly while the menu is closed. Once exhausted, the battle resumes at full speed even if the menu stays open. This is intentionally provisional and still needs human validation.

## P0-0.10.1 hotfix

The initial P0-0.10.0 shell could become stuck behind the landscape-orientation blocker on iOS standalone PWA because it trusted a transient portrait `innerWidth/innerHeight` report. P0-0.10.1 accepts multiple landscape signals (`visualViewport`, CSS orientation media query, screen angle, and inner dimensions), debounces transient orientation events, and defaults to non-blocking behavior when any reliable landscape signal is present.

## Scope boundary

P0 proves ownership and state seams, not final encounter tuning, full Act 1 content, final art, or final protected-reading policy. Later map nodes are visible but locked placeholders for P2/P3.
