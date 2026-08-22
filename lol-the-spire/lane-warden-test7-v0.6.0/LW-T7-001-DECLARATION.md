# LW-T7-001 — Test 7 Information Legibility

**Status:** DECLARED — thresholds frozen before human execution  
**Declared:** 2026-08-22T16:06:00-04:00  
**Design baseline:** 1.7  
**Harness build:** T7-0.6.0  
**Question:** What information must remain on the battlefield itself?

## Design basis

Test 7 compares battlefield treatments for the six information problems named by the prototype standard:

1. ordinary lane-unit health;
2. Commander identification;
3. Presence;
4. Bastion urgency / `BastionCritical`;
5. Guard regeneration threshold;
6. Gate vulnerability.

The UX specification requires Commander location, Bastion urgency, Guard state/Gate vulnerability and other Tier-1 state to remain continuously readable; Presence must be visible when relevant; ordinary unit health bars should be contextual rather than persistent; critical state may not rely on color alone.

## Device / channel scope

Primary human run:

- iPhone 15 Pro;
- iOS 26.6;
- landscape;
- browser or installed PWA is acceptable for this visual-comparison test;
- channel is recorded but is not an independent variable.

This declaration does not claim smallest-supported-iPhone closure.

## Controlled comparison

The harness presents 12 static phone-scale battlefield trials: six under Treatment A and the same six information problems under Treatment B. Scene facts are equivalent while visual treatment changes.

### Treatment A — persistent/dense control

- ordinary lane units carry persistent health bars/numbers;
- Commander identity is a smaller local marker among similarly instrumented actors;
- objective information emphasizes exact values and persistent labels;
- multiple simultaneous battlefield instruments remain visible.

### Treatment B — causal/contextual candidate

- ordinary lane-unit health is hidden unless strategically relevant (the badly wounded unit receives contextual treatment);
- Commander uses a larger distinctive silhouette/diamond independent of Presence;
- Presence is a readable local boundary with affected-unit reinforcement;
- Bastion urgency uses coarse clock state plus a non-color critical icon/label;
- Guard state explicitly distinguishes regeneration/stalling from net progress;
- Gate vulnerability uses a shield/breach shape plus text, not color alone.

The player sees only neutral labels `TREATMENT A` and `TREATMENT B` during trials so the intended candidate is not disclosed before completion.

## Trial order

The fixed order alternates treatments to reduce simple block-order learning:

1. Commander — A
2. Guard threshold — B
3. Presence — A
4. ordinary unit health — B
5. BastionCritical — A
6. Gate vulnerability — B
7. Commander — B
8. Guard threshold — A
9. Presence — B
10. ordinary unit health — A
11. BastionCritical — B
12. Gate vulnerability — A

## Metrics

For each trial record:

- category;
- treatment;
- question;
- correct answer;
- selected answer;
- correct/incorrect;
- response time.

The harness also records:

- candidate-treatment median response time;
- candidate-treatment slow-read count (>6 s);
- accuracy by treatment and category;
- viewport/orientation/DPR;
- minimum answer-target dimensions;
- overflow/occlusion checks;
- post-test perceived visual crowding for each treatment (1–5);
- preferred treatment and optional note.

## Acceptance thresholds

All primary candidate checks must hold:

1. **Coverage:** all 12 trials completed.
2. **Candidate recognition:** Treatment B is **6/6 correct**.
3. **Candidate time:** Treatment B median response time is **≤4.0 seconds**.
4. **Candidate slow tail:** no more than **1/6** Treatment B response is >6.0 seconds.
5. **Overall error guard:** at least **11/12 correct** across both treatments.
6. **Category floor:** no information category is missed under both treatments.
7. **Phone layout:** every answer target is at least **44 × 44 CSS pixels**, the battlefield scene and answers remain within the landscape viewport, and no test control occludes the answer area.
8. **Redundant critical encoding:** Treatment B's Bastion critical, Guard threshold, Gate vulnerability, and Commander identity treatments each use a non-color carrier (shape/icon/text). This is a structural harness check.

Post-test crowding ratings and treatment preference are **descriptive evidence**, not pass/fail thresholds. One user's preference is not a statistical superiority claim.

## Interpretation

A PASS supports carrying Treatment B's information policy forward into Test 8 / production-HUD work:

- persistent battlefield identity/state for Commander, Presence, Bastion urgency, Guard threshold and Gate vulnerability;
- contextual rather than universal ordinary-unit health instrumentation.

A FAIL identifies which category needs a revised battlefield treatment before Phone HUD work is layered on top.
