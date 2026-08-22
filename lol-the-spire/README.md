# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

## Current formal test build

- `lane-warden-test6-v0.5.0/` — **LW-T6-001 / Test 6 — Global Awareness / Lane Strip.** Freezes R02-D gameplay and ATT-002 semantics, performs only measurement-hygiene UX cleanup, locks `Middle temptation` at 1×, and asks eight live lane-identification questions while simulation continues. Thresholds are preregistered in `LW-T6-001-DECLARATION.md`: 8/8 coverage, at least 7/8 correct, median correct response ≤4.0 s, at most two correct responses >6.0 s, at most one camera-tax prompt, at most one incorrect lane tap, and target-device layout hygiene. The run is device-scoped to iPhone 15 Pro / iOS 26.6 / installed standalone PWA; a PASS does not by itself close a smaller eventual support floor.

## R-02 exploratory references

- `lane-warden-r02-v0.4.3/` — **R02-D / ATT-002 reference.** Human feedback was strongly positive: the circular severity alert and grey/yellow/orange/red escalation were immediately readable and the severity behavior was described as working perfectly. Placement crowded the Lane Warden brand block, so Test 6 moves the same 48 px target to a dedicated position above the lane strip. See `ATT-002-EXPLORATORY-RESULT.md`.
- `lane-warden-r02-v0.4.2/` — **R02-C / REFORM-001 reference.** Human evidence exercised both paths: Rival reform retargeted away from camped Mid pressure and reformed South; the player Commander was incapacitated South, manually selected North, locked North with ~2 s remaining, and reformed there. See `R02-C-EXPLORATORY-RESULT.md`.
- `lane-warden-r02-v0.4.1/` — **R02-B rotation-pressure reference.** Human Middle temptation evidence produced the intended offensive-versus-neglect fork: full Mid Guard line broken at 119.27 s, North Bastion broken at 165.33 s, win at 179.80 s with 77% Core. The same run exposed repeatable Rival spawn locking. See `R02-B-EXPLORATORY-RESULT.md`.
- `lane-warden-r02-v0.4.0/` — **R02-A structural spike.** First human evidence established that Rival movement could pull rotations and concentrated Mid pressure could cross Guard replacement, but outer Bastion pressure was too weak. See `R02-A-EXPLORATORY-RESULT.md`.

## Engineering references

- `lane-warden-m0-v0.3.0/` — **M0.5 / Test 0b PASS.** DET-001 deterministic fixed-step continuation and mobile recovery reference.
- `lane-warden-m0-v0.2.4/` — final R-01 human reference; ATT-001 informed without camera seizure and deliberate sacrifice remained observable.

Prior versioned M0 builds remain preserved in the archive index.

## Status

**M0 exploratory gameplay/playtest cycle: CLOSED.** Test 0a remains a **COMPOSITE PASS** and Test 0b is **PASS**.

**R-02 strategic structure:** exploratory evidence now supports the three-lane fork, Rival macro pressure, selectable reform, and severity-coded attention. These are not being retuned during Test 6.

**Immediate work:** execute `LW-T6-001` and use its exported Test 6 JSON to decide whether the lane strip/global-awareness layer is decision-grade on the declared iPhone 15 Pro channel.

R-02 still does **not** claim the broader smallest-supported-iPhone closure, formal Rival acceptance, canonical encounter balance, 5–10 minute battle-duration acceptance, or representative strategy diversity.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
