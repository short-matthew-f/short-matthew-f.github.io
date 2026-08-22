# Test 0b — Deterministic Resume Declaration

**Declaration ID:** LW-0B-001  
**Status:** DECLARED — NOT YET RUN  
**Declared:** 2026-08-22  
**Design baseline / build:** 1.7 / M0-0.3.0  
**Fixture / parameter revision:** R-01 / R01-C  
**Patch under test:** DET-001  
**Target device / OS / channel:** iPhone 15 Pro · iOS 26.6 · installed standalone PWA

## Question

Can one in-progress Lane Warden battle be automatically recovered after a mobile interruption and continue from the captured state without hidden-time progress or deterministic divergence?

## Frozen configuration

- R-01 Twin Toll;
- R01-C gameplay parameters, unchanged from v0.2.4;
- Siege + delay deployment for the manual lifecycle run;
- simulation speed **1×** for formal lifecycle evidence;
- authoritative simulation step **1/60 s**;
- one automatic recovery slot;
- recovery interval approximately **5 simulation seconds** plus background/pagehide capture.

The user may inspect the Lab drawer. The formal lifecycle run should not alter gameplay parameters or simulation speed after battle start.

## Acceptance criteria

LW-0B-001 passes only if all of the following are satisfied:

1. **Snapshot round-trip:** built-in self-check reports exact state-hash equality before and immediately after restoring the same live checkpoint.
2. **Short continuation:** two independent continuations of **600 fixed steps / 10 seconds** from the same checkpoint end with identical deterministic state hashes.
3. **Long continuation:** two independent continuations of **1800 fixed steps / 30 seconds** from the same checkpoint end with identical deterministic state hashes.
4. **Compatibility rejection:** the self-check confirms that a deliberately incompatible snapshot schema is rejected rather than silently loaded.
5. **Background suspension:** after backgrounding the installed PWA for at least **15 real seconds**, returning to it does not advance the simulation by the hidden wall-clock interval and does not execute catch-up simulation for that interval.
6. **Recovery after relaunch:** after a live automatic snapshot exists, a reload or standalone-PWA relaunch restores the latest compatible battle snapshot and the restored deterministic state hash equals the snapshot's recorded hash.
7. **Single-slot semantics:** automatic saves replace the prior recovery state; the product exposes no selectable historical rollback state.
8. **No recovery corruption:** the resumed battle remains controllable and can continue producing normal simulation/evidence after restore.

## Failure conditions

The declaration fails if any of the following occurs during the qualifying run:

- any required exact-hash comparison differs;
- an incompatible snapshot is accepted;
- hidden wall-clock time advances the battle or is consumed as catch-up after return;
- a compatible latest snapshot fails to restore after the declared interruption/relaunch path;
- the player can select an older recovery point;
- restore leaves the battle uncontrollable or structurally corrupted.

A browser/process termination that prevents the operating system from delivering a final pagehide event is **not by itself** a failure if the most recent interval snapshot restores correctly; the declared contract is recovery from the latest automatic snapshot, not zero-loss persistence of every rendered frame.

## Manual run procedure

1. Launch the installed PWA and start **Siege + delay** at 1×.
2. Allow at least 30 seconds of ordinary battle simulation so interval snapshots exist.
3. Open Lab and run **RUN SELF-CHECK**. Record PASS/FAIL; do not continue as a qualifying run if it fails.
4. Close Lab. Note the battle timer, background the PWA for at least 15 real seconds, then return. Confirm the battle timer did not jump by the hidden interval.
5. Continue for at least 10 simulation seconds so a fresh recovery snapshot exists.
6. Reload or fully relaunch the standalone PWA. The battle should restore automatically from the latest compatible snapshot.
7. Continue ordinary play for at least 20 simulation seconds after restore.
8. Export gameplay evidence. If useful, also export the recovery snapshot from Lab.

## Evidence interpretation

This declaration is about deterministic mobile battle recovery only. It does not upgrade R01-C to shipping balance, does not validate R-02/Rival/Reclamation state that is not present in this fixture, and does not turn the existing ATT-001 exploratory human evidence into a formal acceptance result.
