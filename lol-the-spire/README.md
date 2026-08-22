# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current exploratory gameplay build:

- `lane-warden-r02-v0.4.1/` — **R02-B rotation-pressure revision.** Carries the three-lane/Rival structural spike forward after the first R02-A human run. Neglected North/South pressure is stronger, Bastion durability is reduced, Rival scoring is less dominated by player absence, Rival lane choice has hysteresis, damaged Guard pressure attracts contest, reform chooses a high-value enemy anchor, and tower-destruction telemetry is fixed. This remains exploratory and does not claim canonical R-02 balance or Test 6/7/8 acceptance.

R-02 exploratory reference:

- `lane-warden-r02-v0.4.0/` — **R02-A structural spike.** First human evidence was useful but incomplete: the Rival clearly changed rotations and middle concentration crossed Guard replacement, while the outer Bastions remained too safe. The first six Rival lane decisions were followed by Commander orders to the same lane; middle Guard position 0 broke at 114.38 s and the second position reached 34% by 130 s; no Bastion warning or break occurred. See `R02-A-EXPLORATORY-RESULT.md`.

Deterministic engineering reference:

- `lane-warden-m0-v0.3.0/` — **M0.5 / Test 0b PASS.** DET-001 hardens the frozen R01-C harness with an authoritative 60 Hz simulation step, one versioned automatic recovery snapshot, no background progress/catch-up, exact snapshot round-trip checking, deterministic continuation checks, compatibility rejection, and exact relaunch restore. `LW-0B-001` passed on 2026-08-22.

Final R-01 human reference build:

- `lane-warden-m0-v0.2.4/` — Lane Warden M0.4 ATT-001 attention/offscreen-threat UX experiment over frozen `R01-C`. The final human run retained the intended strategic fork while exercising the new attention layer: fork opened at 158s; North Guard broke at 175.98s; South warning fired at 186s; the player used the focus marker at 204s and 210s; South escalated to critical at 234s; the player still spent the next 60g offensively on North at 258.73s; South Bastion fell at 265.2s; Gate victory arrived at 286.6s with 65.2% Core health remaining. Debrief remained `sacrifice=yes / guardRead=clear / goldFork=yes`.

Prior builds:

- `lane-warden-m0-v0.2.3/` — R01-C pacing/consequence human test. Human Siege + delay evidence: win 265s, fork opened at 160s, North Guard broke at 174.41s, two Pushes + one Overdrive, South Bastion ended at 0.6%, debrief `sacrifice=yes / guardRead=clear / goldFork=yes`.
- `lane-warden-m0-v0.2.2/` — decision-legibility isolation over frozen R01-B. Human evidence produced a 186.6s win with `sacrifice=yes`, `guardRead=clear`, `goldFork=yes`.
- `lane-warden-m0-v0.2.1/` — corrected R-01 human decision-test candidate using `R01-B`.
- `lane-warden-m0-v0.2.0/` — first gameplay-bearing M0.4 harness using `R01-A`; fixture later found nonconformant for canonical R-01 strategy evidence.
- `lane-warden-m0-v0.1.6/` — `LW-0A-003`; **PASS.** Together with retained long-run evidence from `LW-0A-001`, Test 0a is a **COMPOSITE PASS**.
- `lane-warden-m0-v0.1.5/` — `DIAG-PC-001`; pointer lifecycle/capture diagnostic.
- `lane-warden-m0-v0.1.4/` — `LW-0A-002`; **SUPERSEDED BEFORE EXECUTION**.
- `lane-warden-m0-v0.1.3/` — `LW-0A-001`; formal result **FAILED** on its preregistered raw pointer-cancel criterion; renderer/channel evidence remains retained.
- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the original battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

## Status

**M0 exploratory gameplay/playtest cycle: CLOSED.** Test 0a remains a **COMPOSITE PASS** and Test 0b is **PASS**. v0.2.4 remains the final R-01 human reference; v0.3.0 is the deterministic mobile-resume engineering reference.

**R-02 structural work is active.** R02-A established two useful facts: concentration can cross a multi-position Guard line, and Rival movement can materially change Commander rotations. It also exposed two problems: neglect was not costly enough, and the Rival's lane choice collapsed to the same `exploiting your absence` behavior on every decision.

**Immediate gameplay work:** run R02-B, preferably with the same `Middle temptation` shape at 1×, and look for the actual Act 2 fork: a winning middle push versus an outer Bastion/Rival problem that is costly enough to ignore but not automatically mandatory to rescue.

R-02 still does **not** claim formal three-lane hardware acceptance, Rival acceptance, canonical encounter balance, 5–10 minute battle-duration acceptance, or representative strategy diversity.

See `M0-CLOSEOUT.md`, `lane-warden-m0-v0.3.0/LW-0B-001-RESULT.md`, and `lane-warden-r02-v0.4.0/R02-A-EXPLORATORY-RESULT.md` for handoff evidence.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
