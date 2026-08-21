# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current build:

- `lane-warden-m0-v0.2.2/` — Lane Warden M0.4 decision-legibility isolation build. It keeps `R01-B` combat, fixture, and the v0.2.1 gameplay runtime unchanged while layering `DL-001`: explicit `DMG > REGEN / DMG ≈ REGEN / REGEN > DMG` Guard language, visible 60g intervention readiness, and a compact tap-through `FORK OPEN` cue. This tests whether the intended commitment/sacrifice decision becomes legible before any further combat retuning.

Prior builds:

- `lane-warden-m0-v0.2.1/` — corrected R-01 human decision-test candidate using `R01-B`. Human evidence found battlefield tapping easy, Thin held the replacement threshold through 462.7s, Balanced won at 210s but Guard replacement was reported unclear, and Siege + delay lost with 171g unspent and no intervention. Preserved as the comparison baseline for v0.2.2.
- `lane-warden-m0-v0.2.0/` — first gameplay-bearing M0.4 harness using `R01-A`. Its implementation/UX evidence is retained, but its Twin Toll enemy script was later found nonconformant, so its playtests are not canonical R-01 strategy-tuning evidence.
- `lane-warden-m0-v0.1.6/` — `LW-0A-003`; **PASS.** Together with the retained 20-minute renderer/channel evidence from `LW-0A-001`, this closed M0 Test 0a as a **COMPOSITE PASS**.
- `lane-warden-m0-v0.1.5/` — `DIAG-PC-001`; short pointer lifecycle/capture diagnostic. It established that observed active cancellations were interrupted pans with clean recovery and exposed the latent cancel-as-tap path in the frozen core.
- `lane-warden-m0-v0.1.4/` — `LW-0A-002`; **SUPERSEDED BEFORE EXECUTION** after diagnostic evidence refined the pointer-cancel failure model.
- `lane-warden-m0-v0.1.3/` — `LW-0A-001`; formal result **FAILED** on its preregistered raw pointer-cancel criterion. Its 20-minute renderer/channel stability and performance evidence remains retained for the unchanged rendering/simulation path; the historical verdict itself is not rewritten.
- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the original battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

## M0 status

**Test 0a: COMPOSITE PASS.** The delivery channel is closed as a preproduction risk. M0.4 is active. R01-B combat is currently frozen while v0.2.2 isolates whether clearer Guard replacement math and intervention/fork signaling produce the intended human commitment story.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
