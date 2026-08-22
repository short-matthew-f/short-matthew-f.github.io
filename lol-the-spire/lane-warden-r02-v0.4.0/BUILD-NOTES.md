# R-02 v0.4.0 — Build Notes

## Carried forward deliberately

- iPhone-first landscape shell and safe-area HUD conventions;
- tap-through informational HUD behavior;
- direct pan/pinch/recenter/lane-strip camera navigation;
- ATT-001 warning/focus principle with no automatic camera seizure;
- R-01 unit/tower vocabulary as provisional shared content;
- authoritative 60 Hz fixed-step simulation;
- single-slot automatic recovery, no background progress, deterministic continuation check.

## New structural work

- three simultaneous lanes;
- 8 Unit / 6 tower deployment budget;
- rear / central / forward tower positions;
- two authored junction columns and route-through-junction lane changes;
- Rival Commander with readable intent, lane movement, influence, direct contest, incapacitation, reform, and macro-window reward only;
- lane strip markers for both Commanders;
- ordered multi-position Guard-line state;
- three-lane gameplay export and recovery schema.

## Explicitly not frozen

- R02-A pulse recipes and cadences;
- exact Guard counts per lane;
- battlefield coordinates;
- Rival scoring weights, stats, decision cadence, and influence values;
- encounter balance and battle-duration distribution;
- Test 6/7/8 thresholds.

## Spike-only loader

`main-loader.js` performs a small guarded source-patch pass before executing `main.js`. It fixes one initial source-token typo and hardens physical lane ownership during junction travel. Every patch has a required sentinel and fails visibly rather than silently running a different game. This is acceptable for the exploratory spike but should be folded into a clean runtime source file before production hardening.
