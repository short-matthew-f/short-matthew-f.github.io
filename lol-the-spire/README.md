# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current build:

- `lane-warden-m0-v0.2.0/` — Lane Warden M0.4 shared gameplay harness. First gameplay-bearing build after Test 0a closure, using the two-lane `R-01 — Twin Toll` proving ground and explicit exploratory parameter revision `R01-A`. It implements locked deployment, real pulses/fronts, Guard replacement pressure, Bastion/Core clocks, one-lane Gate vulnerability, Commander Presence/rotation/Waypoint/Rally, tower roles, and the first push-versus-stabilize gold fork. It does **not** claim final balance or strategic validation.

Prior builds:

- `lane-warden-m0-v0.1.6/` — `LW-0A-003`; **PASS.** Together with the retained 20-minute renderer/channel evidence from `LW-0A-001`, this closed M0 Test 0a as a **COMPOSITE PASS**.
- `lane-warden-m0-v0.1.5/` — `DIAG-PC-001`; short pointer lifecycle/capture diagnostic. It established that observed active cancellations were interrupted pans with clean recovery and exposed the latent cancel-as-tap path in the frozen core.
- `lane-warden-m0-v0.1.4/` — `LW-0A-002`; **SUPERSEDED BEFORE EXECUTION** after diagnostic evidence refined the pointer-cancel failure model.
- `lane-warden-m0-v0.1.3/` — `LW-0A-001`; formal result **FAILED** on its preregistered raw pointer-cancel criterion. Its 20-minute renderer/channel stability and performance evidence remains retained for the unchanged rendering/simulation path; the historical verdict itself is not rewritten.
- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the original battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

## M0 status

**Test 0a: COMPOSITE PASS.** The delivery channel is closed as a preproduction risk. M0.4 is now active: build cumulative gameplay evidence against the shared harness before entering deterministic snapshot/Test 0b work.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
