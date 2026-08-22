# Test 8 — Phone HUD Closeout

**Declaration:** LW-T8-002  
**Build:** T8-0.7.1  
**Status:** CLOSED — PASS BY MEASUREMENT ADJUDICATION  
**Date:** 2026-08-22

## Human/device result

Observed on iPhone 15 Pro, landscape, standalone PWA.

- guided interactions: **8/8**
- accidental inputs: **0**
- persistent HUD footprint: **25.3%** against declared maximum **28%**
- maximum footprint with transient panel: **34.0%** against declared maximum **42%**
- safe-area / viewport containment: **PASS**
- player: HUD coexistence **YES**
- player: one-thumb ordinary loop **YES**
- player: battlefield remained readable **YES**
- player: any required control hard to hit **NO**

## Scorer defect adjudication

The exported automatic verdict was FAIL only because `touchTargets` reported a minimum target size of `0 × 0`.

The scorer's `visible()` helper checked each control's own hidden/display/visibility state but did not check hidden ancestors. Descendant buttons inside hidden transient and post-test panels therefore entered the target list while their ancestor was hidden. `getBoundingClientRect()` correctly returned zero-sized rectangles for those non-rendered descendants, poisoning the minimum.

This is an instrumentation defect rather than evidence of an undersized production control. The candidate CSS explicitly declared the sampled required production controls at or above the 44 CSS-pixel floor, and every required human interaction completed reliably.

No gameplay, HUD treatment, threshold, or user evidence was changed after the run.

## Conclusion

The candidate phone-HUD footprint is accepted for preproduction continuation.

Carry forward:

- compact persistent top resource/readiness strip;
- direct ability controls;
- lane strip;
- contextual Waypoint targeting;
- contextual selected-structure detail;
- one-thumb-capable ordinary loop;
- production controls kept out of the central moving battlefield whenever possible.
