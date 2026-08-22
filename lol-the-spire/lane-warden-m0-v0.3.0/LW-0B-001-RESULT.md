# Lane Warden M0.5 — LW-0B-001 Result

**Result:** PASS  
**Run:** 2026-08-22  
**Build:** M0-0.3.0  
**Fixture / parameter revision:** R-01 / R01-C  
**Patch:** DET-001  
**Target channel:** installed standalone PWA on the declared iPhone test device

## Declaration

`LW-0B-001` was preregistered before the qualifying run in `TEST-0B-DECLARATION.md`. It asked whether one in-progress Lane Warden battle could be automatically recovered after a mobile interruption and continue from the captured state without hidden-time progress or deterministic divergence.

## Evidence reviewed

Qualifying gameplay export:

`lane-warden-M0-0.3.0-R01-C-gameplay-2026-08-22T10-46-54-241Z.json`

The tester also directly reported that the declared background/relaunch procedure worked as intended.

## Acceptance results

1. **Snapshot round-trip — PASS.** At 30.52 s the self-check restored hash `39ba3d0f` to `39ba3d0f`, exact=true.
2. **600-step / 10 s continuation — PASS.** Both independent continuations ended at `63776ebd`.
3. **1800-step / 30 s continuation — PASS.** Both independent continuations ended at `ec5611a3`.
4. **Compatibility rejection — PASS.** The deliberately incompatible snapshot was rejected and `incompatibleRejected=true`.
5. **Background suspension — PASS.** Gameplay telemetry records hidden and visible at the same simulation time (41.63 s), with no hidden-time timer jump; the tester confirmed the declared real-time background interval behaved correctly.
6. **Recovery after relaunch — PASS.** A boot restore at 44.62 s reports expected hash `f0201adf`, actual hash `f0201adf`, exact=true.
7. **Single-slot semantics — PASS.** The build uses one replacement recovery slot and exposes no historical rollback selector.
8. **No recovery corruption — PASS.** After boot restore, the battle continued normally through additional interval snapshots at 49.63 s, 54.65 s, and 59.67 s; the export was taken at 61.52 s with an active controllable battle.

## Formal disposition

**LW-0B-001 passes. Test 0b is closed.**

This closes the deterministic mobile-resume risk for the state represented by the frozen R-01 harness. It does not yet prove serialization/resume coverage for Rival Commander or Reclamation state because those systems are not present in R-01.

## Non-blocking instrumentation defect

The exported file contains the correct DET-001 payload and passing determinism evidence, but the final top-level export metadata is normalized back to `schema: 3` and the older exploratory `tuningStatus` by the nested DL-001 Blob wrapper. This is an export-wrapper ordering defect only; it does not affect simulation state, recovery storage, hash equality, or this Test 0b verdict.

Correct the export-wrapper ordering before the hardened harness is copied forward into the R-02 implementation. No repeat of LW-0B-001 is required if that correction remains telemetry-only.
