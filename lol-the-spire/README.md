# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current build:

- `lane-warden-m0-v0.2.3/` — Lane Warden M0.4 R-01 pacing/consequence candidate using `R01-C`. It freezes the accepted DL-001 decision-legibility/tap-through UX and the v0.2.2 `main.js`/`rules.js`, then stretches structural resolution through mathematically equivalent effective durability. Deterministic reference: Balanced ~6:46, Siege + delay ~5:12 with a ~50.6s post-Bastion Core clock, All-in ~3:52, Thin no Guard breach by 10 minutes. This is exploratory human pacing evidence, not shipping balance.

Prior builds:

- `lane-warden-m0-v0.2.2/` — decision-legibility isolation over frozen R01-B. Human Siege + delay evidence produced a 186.6s win with `sacrifice=yes`, `guardRead=clear`, `goldFork=yes`; this supports the Twin Toll fork under **informed play**, but does not prove independent teaching/discoverability. The future Attention & Offscreen Threat Signaling experiment was recorded after this run and is intentionally not enabled in v0.2.3.
- `lane-warden-m0-v0.2.1/` — corrected R-01 human decision-test candidate using `R01-B`. Human evidence found battlefield tapping easy, Thin held the replacement threshold through 462.7s, Balanced won at 210s but Guard replacement was reported unclear, and Siege + delay lost with 171g unspent and no intervention. Preserved as the comparison baseline for v0.2.2.
- `lane-warden-m0-v0.2.0/` — first gameplay-bearing M0.4 harness using `R01-A`. Its implementation/UX evidence is retained, but its Twin Toll enemy script was later found nonconformant, so its playtests are not canonical R-01 strategy-tuning evidence.
- `lane-warden-m0-v0.1.6/` — `LW-0A-003`; **PASS.** Together with the retained 20-minute renderer/channel evidence from `LW-0A-001`, this closed M0 Test 0a as a **COMPOSITE PASS**.
- `lane-warden-m0-v0.1.5/` — `DIAG-PC-001`; short pointer lifecycle/capture diagnostic. It established that observed active cancellations were interrupted pans with clean recovery and exposed the latent cancel-as-tap path in the frozen core.
- `lane-warden-m0-v0.1.4/` — `LW-0A-002`; **SUPERSEDED BEFORE EXECUTION** after diagnostic evidence refined the pointer-cancel failure model.
- `lane-warden-m0-v0.1.3/` — `LW-0A-001`; formal result **FAILED** on its preregistered raw pointer-cancel criterion. Its 20-minute renderer/channel stability and performance evidence remains retained for the unchanged rendering/simulation path; the historical verdict itself is not rewritten.
- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the original battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

## M0 status

**Test 0a: COMPOSITE PASS.** The delivery channel is closed as a preproduction risk. M0.4 is active. v0.2.3 tests whether the validated informed-play fork survives a longer, more consequential R01-C battle clock before broader balance work. Independent teaching remains a separate future UX question.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
