# Lane Warden M0.5 — Deterministic Core / Test 0b Entry

**Build:** `M0-0.3.0`  
**Design baseline:** 1.7  
**Fixture:** R-01 Twin Toll  
**Gameplay parameter revision:** R01-C, frozen from v0.2.4  
**Patch:** DET-001

## Purpose

This build does not retune R-01 and is not a new gameplay-balance candidate. It hardens the already-playable shared harness so an in-progress mobile battle can be resumed from one automatic recovery snapshot without advancing while backgrounded.

The immediate question is mechanical:

> From the same captured battle state, does resumed simulation continue exactly like uninterrupted simulation?

## DET-001 behavior

- authoritative fixed simulation step: **1/60 s**;
- one versioned automatic recovery slot in local storage;
- automatic recovery capture every ~5 simulation seconds and on background/pagehide;
- backgrounded battle simulation does not advance;
- return from background does not consume hidden wall time as catch-up simulation;
- newest recovery state replaces the prior state; there is no rollback picker;
- incompatible snapshot schema / fixture / parameter revision is rejected;
- snapshot includes all simulation-affecting state implemented by the R-01 harness: actors, projectiles, pulse schedule, Commander state, lane structures, Gate/Core, economy, cooldowns, deployment, actor/projectile sequence counters, and fixed-step accumulator;
- the schema reserves deterministic RNG state even though the current R-01 simulation contains no simulation-affecting randomness;
- Rival and Reclamation are not implemented in R-01, so this build cannot claim their state has been resume-tested yet.

## Built-in check

The Lab drawer exposes **RUN SELF-CHECK**. From one live checkpoint it requires:

1. exact state-hash equality after snapshot round-trip;
2. exact equality after two independent 600-step / 10 s continuations;
3. exact equality after two independent 1800-step / 30 s continuations;
4. rejection of an incompatible snapshot schema.

This is implementation evidence. Formal Test 0b evidence still follows `TEST-0B-DECLARATION.md` and requires the declared device lifecycle run.

## Telemetry boundary

The simulation recovery state and DET-001 event history persist in the recovery snapshot. DL-001 and ATT-001 presentation telemetry are session-local and restart after a full page/process relaunch. That does not affect resumed simulation state, but this build does **not** claim full diagnostic-log continuity across process death.

## Next gameplay proving ground

After Test 0b closes, instantiate the authored R-02 reference encounter on this hardened harness. R-02 is the next gameplay escalation: three lanes, battlefield geometry, and Rival Commander pressure.
