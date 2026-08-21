# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current build:

- `lane-warden-m0-v0.1.3/` — Lane Warden M0 formal Test 0a readiness harness for `LW-0A-001`, using the frozen v0.1.1 battlefield core with schema-3 evidence and a locked 20-minute Stress segment.

Prior builds:

- `lane-warden-m0-v0.1.2/` — persistent exploratory instrumentation over the immutable v0.1.1 battlefield core.
- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
