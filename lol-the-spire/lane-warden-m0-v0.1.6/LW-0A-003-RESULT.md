# Lane Warden M0 — LW-0A-003 Result

**Result:** PASS

**Run:** 2026-08-21

**Device/channel:** iPhone 15 Pro · iOS 26.6 · installed standalone PWA

## Declaration

`LW-0A-003` was a targeted input-remediation regression following `DIAG-PC-001`. The test used Stress, 180 actors, projectiles on, DPR cap 2, and required 180 seconds of interaction-heavy foreground testing.

Raw `pointercancel` events were telemetry rather than automatic failure. The declared failure conditions were: a Commander order caused by cancellation, retained pointer capture after cancellation cleanup, failure to demonstrate subsequent input recovery, lifecycle interruption, or WebGL context loss.

## Observed result

- Qualified run length: 184.439 s total evidence session; declared 180 s regression completed.
- Stress fixture: PASS, 180 actors.
- Pans: 83 during run (minimum 12).
- Pinches: 28 during run (minimum 6).
- Commander orders: 33 during run (minimum 3).
- Recenters: 6 during run (minimum 1).
- Lane jumps: North 4 · Mid 5 · South 6.
- Pointer cancels: 0.
- WebGL context losses: 0.
- Lifecycle failures: 0.
- HUD/safe-area manual confirmation: PASS.
- Input-clean manual confirmation: PASS.
- Audible sound confirmation: PASS.
- Cancellation remediation reported installed.

The targeted regression therefore satisfies `LW-0A-003`.

## Test 0a closure

M0 Test 0a is closed as a **composite PASS**:

- `LW-0A-001` remains historically **FAILED** on its original preregistered raw-pointer-cancel criterion. Its 20-minute renderer/channel stability and performance evidence remains retained for the unchanged rendering/simulation path.
- `DIAG-PC-001` identified that raw iOS pointer cancellation was not an adequate user-level failure definition and exposed the latent cancel-as-tap code path.
- `LW-0A-002` remains **SUPERSEDED BEFORE EXECUTION**.
- `LW-0A-003` validates the cancellation remediation and the user-level input safety path.

No historical verdict is rewritten by this closure.

## Non-blocking observation

The three-minute regression recorded a 114 ms maximum core frame and 4 frames over 50 ms. Performance thresholds were not part of `LW-0A-003`; the declared long-run renderer/channel performance evidence is retained from `LW-0A-001`. This observation should remain visible for future regression comparison but does not change the `LW-0A-003` result.
