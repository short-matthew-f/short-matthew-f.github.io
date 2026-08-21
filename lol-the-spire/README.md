# LoL The Spire — deployed test builds

This directory is a versioned GitHub Pages test archive.

## Convention

Each deployed build gets a new immutable subfolder under `lol-the-spire/` rather than replacing the previous deployment.

Current build:

- `lane-warden-m0-v0.1.2/` — Lane Warden M0 Test 0a instrumentation over the immutable v0.1.1 battlefield core.

Prior build:

- `lane-warden-m0-v0.1.1/` — first real-device exploratory Web/PWA channel spike.

When a newer build is deployed, add a new subfolder and update `lol-the-spire/index.html` to mark it current. Preserve prior folders for regression testing and comparison unless explicitly retired.
