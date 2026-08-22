# LW-T6-001 — Test 6 Global Awareness / Lane Strip

**Status:** DECLARED — thresholds frozen before human execution
**Declared:** 2026-08-22
**Design baseline:** 1.7
**Harness build:** T6-0.5.0
**Frozen gameplay base:** M1-0.4.3 / R02-D over R02-C gameplay and REFORM-001
**Fixture / parameter revision:** R-02-STRUCTURAL / R02-C gameplay parameters; ATT-002 presentation retained

## Question

Can the player understand important offscreen state without constantly panning?

The normative test requires fronts, Bastions, Guards, player Commander, Rival Commander when applicable, and exceptional threats. The lane strip must expose multiple dimensions rather than collapse them into a single recommendation.

## Device scope

Formal run target for **LW-T6-001**:

- iPhone 15 Pro
- iOS 26.6
- installed standalone PWA
- landscape

This declaration is device-scoped. A PASS is valid evidence for this exact hardware/channel. It does **not** close the broader smallest-supported-iPhone requirement unless this device is later declared to be the support floor or the same thresholds are reproduced on the actual minimum device.

## Frozen configuration

- `Middle temptation` deployment preset
- simulation speed `1×`
- no gameplay retuning during the run
- eight live awareness prompts
- simulation continues while prompts are answered
- lane-strip taps answer the active prompt and do not move the camera until after the answer is recorded

Required prompt coverage across the eight scored prompts:

1. player Commander location;
2. Rival Commander location;
3. friendly front position;
4. Bastion urgency;
5. Guard progress / replacement state;
6. exceptional active threat;
7–8. repeat eligible categories under later battle state.

A prompt waits for a uniquely scorable state rather than inventing a correct answer during a tie.

## Metrics

For every prompt:

- category;
- question text;
- correct lane captured at prompt start;
- selected lane;
- correct / incorrect;
- response time;
- whether battlefield camera housekeeping occurred before the answer;
- camera state at prompt start and answer;
- battle clock at prompt start.

The harness also records viewport dimensions and lane-strip / alert-badge bounding boxes.

## Acceptance thresholds

All must hold:

1. **Coverage:** 8/8 prompts completed, including at least one scored prompt from every required category above.
2. **Recognition accuracy:** at least **7/8 correct** (87.5%).
3. **Time to identify:** median correct-response time **≤ 4.0 seconds**.
4. **Slow-read tail:** no more than **2 correct responses > 6.0 seconds**.
5. **Camera tax:** no more than **1/8 prompts** includes battlefield pan, pinch, recenter, or non-answer camera navigation before the answer.
6. **Lane targeting:** no more than **1 incorrect lane selection total**; no unresponsive/ambiguous lane-strip tap observed.
7. **Target-device layout hygiene:** all three lane segments are simultaneously present and tappable; no known test/HUD control overlaps the lane strip; the severity badge has at least a **44 × 44 CSS-pixel tap target** and does not cover the brand block.

Any failure above is a **FAIL for LW-T6-001 on the declared device**, not permission to change thresholds after the run.

## Why these thresholds

The design requires Tier-1 state to be continuously readable, describes the second-to-second loop as `read → decide → act`, and explicitly rejects camera housekeeping as a skill test. Four seconds is therefore used as the decision-grade recognition target rather than as a claim that every player must answer instantly. One error / one camera-tax event is allowed so a single human slip does not masquerade as systemic failure, while 7/8 accuracy still requires reliable global comprehension.

## Evidence

The Test 6 harness exports a separate `lane-warden-LW-T6-001-...json` evidence file containing the frozen declaration, layout sample, per-prompt responses, and computed verdict.
