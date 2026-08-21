# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current build:

- `lane-warden-m0-v0.2.1/` — Lane Warden M0.4 corrected R-01 human decision-test candidate using `R01-B`. Twin Toll now uses the intended fast balanced North / delayed siege South topology, the browser runtime and deterministic simulator share one fixture configuration, the Bastion→Core sacrifice clock is separated into two meaningful windows, Guard replacement resists thin pressure, and the HUD informational layers are tap-through with Lab/actions collapsed by default. This is **exploratory human-test tuning**, not final balance.

Prior builds:

- `lane-warden-m0-v0.2.0/` — first gameplay-bearing M0.4 harness using `R01-A`. Its implementation/UX evidence is retained, but its Twin Toll enemy script was later found nonconformant, so its playtests are not canonical R-01 strategy-tuning evidence.
- `lane-warden-m0-v0.1.6/` — `LW-0A-003`; **PASS.** Together with the retained 20-minute renderer/channel evidence from `LW-0A-001`, this closed M0 Test 0a as a **COMPOSITE PASS**.
- `lane-warden-m0-v0.1.5/` — `DIAG-PC-001`; short pointer lifecycle/capture diagnostic. It established that observed active cancellations were interrupted pans with clean recovery and exposed the latent cancel-as-tap path in the frozen core.
- `lane-warden-m0-v0.1.4/` — `LW-0A-002`; **SUPERSEDED BEFORE EXECUTION** after diagnostic evidence refined the pointer-cancel failure model.
- `lane-warden-m0-v0.1.3/` — `LW-0A-001`; formal result **FAILED** on its preregistered raw pointer-cancel criterion. Its 20-minute renderer/channel stability and performance evidence remains retained for the unchanged rendering/simulation path; the historical verdict itself is not rewritten.
- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the original battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

## M0 status

**Test 0a: COMPOSITE PASS.** The delivery channel is closed as a preproduction risk. M0.4 is active: the current question is whether corrected R-01 produces the intended human commitment/sacrifice story before ordinary-battle duration and wider strategy balance are tuned further.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
