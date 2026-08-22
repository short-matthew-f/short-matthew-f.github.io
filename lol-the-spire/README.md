# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current exploratory gameplay build:

- `lane-warden-r02-v0.4.2/` — **R02-C / REFORM-001.** Freezes R02-B combat pacing and isolates selectable reform anchors. While the player Commander is incapacitated, the lane strip chooses a reform lane until a final 2-second lock. The Rival also reevaluates reform anchors during downtime and penalizes lanes already camped by player pressure near the enemy anchor. No post-reform invulnerability is added.

R-02 exploratory references:

- `lane-warden-r02-v0.4.1/` — **R02-B rotation-pressure reference.** Human Middle temptation evidence produced the intended offensive-versus-neglect fork: Mid Guard position 0 broke at 97.70 s, the full Mid Guard line broke at 119.27 s, North Bastion warned at 108.80 s, became critical at 143.07 s, broke at 165.33 s, and the player still won at 179.80 s with 77% Core. Debrief: `globalRead=yes / rivalChanged=no / rivalPredict=yes`. The same run exposed repeatable Rival spawn locking after reform. See `R02-B-EXPLORATORY-RESULT.md`.
- `lane-warden-r02-v0.4.0/` — **R02-A structural spike.** First human evidence established that Rival movement could pull rotations and concentrated Mid pressure could cross Guard replacement, but outer Bastion pressure was too weak. See `R02-A-EXPLORATORY-RESULT.md`.

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

**R-02 structural work is active.** R02-B is the first human run to demonstrate the intended three-lane fork under readable global information: the player kept winning Mid while knowingly allowing North to fail, then won before the Core failed. The remaining defect from that run is Commander spawn locking, not the fork itself.

**Immediate gameplay work:** run R02-C with `Middle temptation` at 1×. Confirm that the R02-B fork survives and that Rival reform no longer collapses into repeated 2–3 second deaths. If the player Commander is incapacitated, change its reform lane at least once to exercise the player-side selector.

R-02 still does **not** claim formal three-lane hardware acceptance, Rival acceptance, canonical encounter balance, 5–10 minute battle-duration acceptance, or representative strategy diversity.

See `M0-CLOSEOUT.md`, `lane-warden-m0-v0.3.0/LW-0B-001-RESULT.md`, `lane-warden-r02-v0.4.0/R02-A-EXPLORATORY-RESULT.md`, and `lane-warden-r02-v0.4.1/R02-B-EXPLORATORY-RESULT.md` for handoff evidence.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
