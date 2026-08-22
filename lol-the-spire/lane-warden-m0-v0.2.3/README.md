# Lane Warden — M0 v0.2.3

R-01 Twin Toll pacing/consequence pass after R01-B established the intended fork under informed human play.

## What changed from v0.2.2

- **DL-001 is frozen:** same Guard `DMG > REGEN / DMG ≈ REGEN / REGEN > DMG`, 60g readiness, FORK OPEN cue, and tap-through interaction model.
- Unit movement, unit-vs-unit damage/cadence, pulse cadence, Twin Toll enemy packages/cadence, gold rules, Commander rules, towers, and Siege Ram identity remain unchanged.
- R01-C uses the **mathematically equivalent durability representation** of 0.6× structural throughput, allowing `main.js` and `rules.js` to remain byte-identical to v0.2.2. Guard/Gate and tower/Bastion/Core effective durability are scaled by 1/0.6; Guard regeneration is equivalently represented at 14/s.
- `r01c-runtime-adapter.js` scales tower HP only; unit movement, unit-vs-unit combat, and tower outgoing damage are unchanged.
- Evidence schema 3 records first `fork-open` and `intervention-ready` UI transitions through the isolated DL-001 instrumentation layer.

## Deterministic reference

- Balanced ~406s.
- Siege + delay ~312s; South Bastion ~265s; Gate ~47s later; Core ~7.6%.
- All-in ~232s with South Bastion critical.
- Thin: no Guard breach at 600s.

These are regression/possibility checks, not human balance proof.

## Human evidence carried forward

R01-B Human Playtest 02 supports the intended decision thesis under **informed play**, but not independent teaching because the player had advance knowledge of the desired sacrifice story.

## Future UX recorded, not enabled here

`ATTENTION-OFFSCREEN-THREAT-SIGNALING.md` records the later toast + world-locked edge indicator + optional tap-to-focus experiment. It is intentionally excluded from R01-C so this build isolates pacing/consequence rather than adding more coaching.
