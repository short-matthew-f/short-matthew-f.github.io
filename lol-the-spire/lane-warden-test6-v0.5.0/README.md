# Lane Warden — Test 6 Global Awareness v0.5.0

Formal device-scoped Test 6 harness over frozen R02-D gameplay.

## What changed

Only UX cleanup needed to make the measurement trustworthy, plus Test 6 instrumentation:

- severity `!` moved out of the Lane Warden brand block into a dedicated left-side attention rail below the objective region;
- lane-strip readability/tap geometry retained and measured;
- Commander/Rival markers gain stronger shape/contrast treatment without changing their semantics;
- Test 6 live quiz layer asks eight lane-identification questions while simulation continues;
- while a question is active, the next lane-strip tap is interpreted as the answer first, so answering does not itself create camera motion;
- camera interactions during a prompt are recorded as camera tax;
- dedicated Test 6 JSON export computes the preregistered verdict.

## Run protocol

1. Install/open this build as the standalone PWA on the declared device.
2. Choose **Middle temptation**.
3. Leave simulation speed at **1×**.
4. Play normally.
5. When a `TEST 6 · TAP A LANE` question appears, answer from the global information layer by tapping North / Mid / South in the lane strip.
6. Do not intentionally pan just to help the test. If you genuinely need to inspect the battlefield, do it; the harness should record that honestly.
7. Complete eight prompts.
8. Tap **EXPORT TEST 6** and send the resulting JSON.

The battle does not need to end for Test 6 to finish.

See `LW-T6-001-DECLARATION.md` for frozen thresholds. A result on iPhone 15 Pro / iOS 26.6 / installed standalone PWA is device-scoped and does not by itself close the smallest-supported-device requirement.
