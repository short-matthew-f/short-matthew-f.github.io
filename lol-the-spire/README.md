# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current build:

- `lane-warden-m0-v0.1.4/` — Lane Warden M0 formal Test 0a follow-up for `LW-0A-002`, using the frozen v0.1.1 battlefield core with schema-4 evidence, orphan-aware pointer-cancel classification, run-relative setup counters, and enforced timed interaction minimums.

Prior builds:

- `lane-warden-m0-v0.1.3/` — `LW-0A-001`; formal result **FAILED** on the preregistered pointer-cancel acceptance criterion. Declared performance, stability, channel, HUD and audio criteria passed.
- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the immutable v0.1.1 battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
