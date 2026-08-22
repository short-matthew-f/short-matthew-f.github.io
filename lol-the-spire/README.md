# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current engineering reference:

- `lane-warden-m0-v0.3.0/` — **M0.5 / Test 0b PASS.** DET-001 hardens the frozen R01-C harness with an authoritative 60 Hz simulation step, one versioned automatic recovery snapshot, no background progress/catch-up, exact snapshot round-trip checking, deterministic continuation checks, compatibility rejection, and exact relaunch restore. `LW-0B-001` passed on 2026-08-22. This build intentionally does **not** retune R-01.

Final R-01 human reference build:

- `lane-warden-m0-v0.2.4/` — Lane Warden M0.4 ATT-001 attention/offscreen-threat UX experiment over frozen `R01-C`. The final human run retained the intended strategic fork while exercising the new attention layer: fork opened at 158s; North Guard broke at 175.98s; South warning fired at 186s; the player used the focus marker at 204s and 210s; South escalated to critical at 234s; the player still spent the next 60g offensively on North at 258.73s; South Bastion fell at 265.2s; Gate victory arrived at 286.6s with 65.2% Core health remaining. Debrief remained `sacrifice=yes / guardRead=clear / goldFork=yes`.

Prior builds:

- `lane-warden-m0-v0.2.3/` — R01-C pacing/consequence human test. Human Siege + delay evidence: win 265s, fork opened at 160s, North Guard broke at 174.41s, two Pushes + one Overdrive, South Bastion ended at 0.6%, debrief `sacrifice=yes / guardRead=clear / goldFork=yes`. Retained as the frozen gameplay baseline for ATT-001.
- `lane-warden-m0-v0.2.2/` — decision-legibility isolation over frozen R01-B. Human Siege + delay evidence produced a 186.6s win with `sacrifice=yes`, `guardRead=clear`, `goldFork=yes`; this supports the Twin Toll fork under **informed play**, but does not prove independent teaching/discoverability.
- `lane-warden-m0-v0.2.1/` — corrected R-01 human decision-test candidate using `R01-B`. Human evidence found battlefield tapping easy, Thin held the replacement threshold through 462.7s, Balanced won at 210s but Guard replacement was reported unclear, and Siege + delay lost with 171g unspent and no intervention. Preserved as the comparison baseline for v0.2.2.
- `lane-warden-m0-v0.2.0/` — first gameplay-bearing M0.4 harness using `R01-A`. Its implementation/UX evidence is retained, but its Twin Toll enemy script was later found nonconformant, so its playtests are not canonical R-01 strategy-tuning evidence.
- `lane-warden-m0-v0.1.6/` — `LW-0A-003`; **PASS.** Together with the retained 20-minute renderer/channel evidence from `LW-0A-001`, this closed M0 Test 0a as a **COMPOSITE PASS**.
- `lane-warden-m0-v0.1.5/` — `DIAG-PC-001`; short pointer lifecycle/capture diagnostic. It established that observed active cancellations were interrupted pans with clean recovery and exposed the latent cancel-as-tap path in the frozen core.
- `lane-warden-m0-v0.1.4/` — `LW-0A-002`; **SUPERSEDED BEFORE EXECUTION** after diagnostic evidence refined the pointer-cancel failure model.
- `lane-warden-m0-v0.1.3/` — `LW-0A-001`; formal result **FAILED** on its preregistered raw pointer-cancel criterion. Its 20-minute renderer/channel stability and performance evidence remains retained for the unchanged rendering/simulation path; the historical verdict itself is not rewritten.
- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the original battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

## Status

**M0 exploratory gameplay/playtest cycle: CLOSED.** Test 0a remains a **COMPOSITE PASS**. **Test 0b is PASS.** v0.2.4 remains the final R-01 human reference; v0.3.0 is the deterministic mobile-resume engineering reference.

The planned PR-001 pressure/commitment probe does **not** need a separate build: its exploratory question was exercised inside the final ATT-001 run. Because no PR-001 acceptance threshold was preregistered, that evidence remains exploratory rather than a formal pass.

**Next gameplay proving ground:** instantiate the already-authored **R-02** reference encounter on the hardened harness to test three lanes, battlefield geometry, and Rival Commander pressure.

A non-blocking v0.3.0 export-wrapper ordering defect leaves the top-level gameplay export labeled `schema: 3` with the older exploratory tuning-status text even though DET-001 evidence is correctly present. Correct that telemetry-only defect when carrying the hardened harness into R-02; it does not change the Test 0b verdict.

M0 still does **not** claim shipping balance, independent teaching/discoverability, formal 5–10 minute acceptance, three-lane hardware viability, or representative-Gate strategy diversity.

See `M0-CLOSEOUT.md` and `lane-warden-m0-v0.3.0/LW-0B-001-RESULT.md` for the concise handoffs.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
