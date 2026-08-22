# LW-T8-001 — Test 8 Phone HUD

**Status:** DECLARED — thresholds frozen before human execution  
**Declared:** 2026-08-22T16:32:00-04:00  
**Design baseline:** 1.7  
**Harness build:** T8-0.7.0  
**Frozen gameplay base:** M1-0.4.3 / R02-D over R02-C parameters  
**Fixture / parameter revision:** R-02-STRUCTURAL / R02-C

## Question

Can production controls coexist with the moving battlefield?

The baseline requires representative gold, abilities, Waypoint, lane strip, selected-structure controls, and safe-area behavior. This test evaluates the footprint and interaction coexistence of those controls over a live moving battle. It does not retune combat.

## Target channel

- iPhone-first
- landscape
- web/PWA
- safe areas respected

Evidence from the actual device records the observed viewport and delivery mode.

## Frozen configuration

- `Middle temptation` deployment preset
- simulation speed `1×`
- R02-D gameplay unchanged
- Test 7 information policy carried forward: contextual ordinary health; distinctive Commander identity; contextual Presence; coarse Bastion urgency; Guard semantic state plus compact directional evidence; explicit Gate vulnerability

## Candidate HUD content

Persistent:

- gold;
- Waypoint readiness;
- Commander recenter;
- representative ability controls;
- Waypoint entry control;
- lane strip;
- selected-structure affordance.

Transient:

- Waypoint target/cancel strip;
- selected-structure detail/actions.

Testing instructions are instrumentation and are not counted as production-HUD footprint.

## Guided interaction sequence

1. Pan the battlefield horizontally.
2. Tap Rally.
3. Enter Waypoint targeting.
4. Cancel Waypoint targeting.
5. Jump to Mid using the lane strip.
6. Open selected-structure controls.
7. Close the structure panel.
8. Recenter on the Commander.

The battle continues underneath these interactions.

## Recorded metrics

- completion of all eight guided interactions;
- target bounding boxes;
- viewport/safe-area containment;
- persistent HUD area as a fraction of viewport area;
- maximum total HUD area while transient controls are open;
- accidental-input risks where a battlefield-originating pointer ends on a HUD control;
- device/orientation;
- human post-test answers for control coexistence, one-thumb ordinary use, preserved combat readability, and hard-to-hit controls.

Area accounting is deliberately conservative: visible control rectangles are summed rather than attempting to subtract overlaps.

## Acceptance thresholds

All must hold:

1. **Task coverage:** 8/8 guided interactions complete.
2. **Touch targets:** every visible required HUD/lane control sampled at **≥44 × 44 CSS px**.
3. **Safe-area / viewport hygiene:** sampled production controls remain fully in bounds.
4. **Persistent occlusion:** summed persistent candidate-HUD footprint **≤28%** of viewport area.
5. **Transient occlusion:** summed candidate footprint with temporary targeting/detail controls **≤42%** of viewport area.
6. **Accidental input:** no more than **1** recorded battlefield-to-control accidental-input risk.
7. **Orientation:** scored interaction samples are landscape.
8. **Human coexistence:** player answers YES that controls can be used without the HUD getting in the way.
9. **One-thumb core:** player answers YES that the ordinary control loop can be operated with one thumb.
10. **Battlefield readability:** player answers YES that enough battlefield remains visible to read combat motion.
11. **Hit reliability:** player answers NO when asked whether any required control was hard to hit reliably.

Any failure is a FAIL for this candidate HUD footprint. It is evidence to change presentation, not permission to shrink targets below comfortable mobile size.

## Why these thresholds

The test register requires occlusion, touch-target, and accidental-input thresholds. The UX baseline prioritizes phone-scale readability, one-thumb-capable core play, direct taps, no dexterity tax, and enough battlefield space for combat motion. The numerical footprint limits are preregistered candidate gates for this build, not design invariants; if they prove poorly calibrated they must be superseded before a new formal run rather than altered after seeing evidence.
