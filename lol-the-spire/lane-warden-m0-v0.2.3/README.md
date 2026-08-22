# Lane Warden — M0 v0.2.2

Decision-legibility isolation build for corrected `R-01 — Twin Toll` using frozen `R01-B` tuning.

## What is intentionally unchanged

- The gameplay runtime (`main.js`) is byte-identical to v0.2.1.
- R01-B combat, cadence, economy, enemy fixture, Guard, Bastion, Core, and Gate values are unchanged.
- The successful tap-through battlefield behavior is retained.

## What changed

The isolated `DL-001` decision layer makes the existing state more explicit without adding battlefield hitboxes:

- Guard pressure reads `DMG > REGEN`, `DMG ≈ REGEN`, or `REGEN > DMG`.
- A 60g intervention becoming usable is visible without opening Actions.
- A compact tap-through `FORK OPEN` cue appears only when a Guard is actually losing while a Bastion/Core sacrifice clock is worsening.
- The objective line mirrors the same decision state.

## Why this build exists

v0.2.1 human evidence found:

- battlefield interaction was easy to use;
- Thin pressure could not breach either Guard through 462.7s even after 300g of interventions;
- Balanced won at 210s, but the player reported Guard replacement as unclear and did not experience the intended sacrifice story;
- Siege + delay lost at 217.2s with 171g unspent and no Push/Overdrive.

That evidence does not justify another numerical tuning pass yet. v0.2.2 asks whether clearer information changes the human decision story while the simulation is held fixed.

## Evidence status

This remains an **exploratory human test**, not shipping balance or formal strategy acceptance. After this legibility-isolated Siege + delay run, R01-B can be judged more fairly.
