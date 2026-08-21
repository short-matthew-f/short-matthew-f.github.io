# Lane Warden M0.4 — Shared Gameplay Harness v0.2.0

This is the first gameplay-bearing build after Test 0a closure.

It implements the two-lane `R-01 — Twin Toll` proving ground with explicit tuning revision `R01-A`. The build is meant to answer whether the specified systems can begin producing Lane Warden's core strategic fork; it is not a shipping encounter and does not claim balance proof.

## Try first

1. Launch **Siege + delay**.
2. Watch North Guard pressure and South Bastion urgency separately.
3. Move the Commander between lanes through the junction; compare walking with Waypoint.
4. Spend the initial 60 gold on either **Push** in the offensive lane or **Overdrive** in the threatened lane.
5. Repeat with **Balanced**, **All-in**, and **Thin everywhere**.
6. Export gameplay evidence from Lab after each useful run.

## Source discipline

- Design baseline 1.7 remains authority.
- Numerical values are documented in `R01-PARAMETER-SET-A.md` as tuning hypotheses.
- `rules.js` keeps deployment legality and basic invariants testable outside the browser.
- `tests/smoke.js` checks legal presets, Gate latch logic, replacement-state classification, and reinforcement type legality.

## Next evidence

This build should first receive short exploratory phone runs. If it produces a real fork, the next step is to preregister focused tests for Pulse & Frontline Formation, Commander Rotation, Guard replacement legibility, and the R-01 strategic-shape comparison before claiming those systems have passed.
