# LW-T7-002 — Test 7 Paired Information Legibility

**Status:** DECLARED — paired comparison replaces LW-T7-001 for the design decision
**Declared:** 2026-08-22
**Design baseline:** 1.7
**Harness build:** T7-0.6.1

## Why LW-T7-001 is insufficient

LW-T7-001 alternated treatments across categories, so the player could not make an immediate apples-to-apples comparison for any one information type. Its evidence remains useful diagnostic data, but its global A-vs-B framing is not sufficient to choose a battlefield information policy.

## Question

For each required battlefield information category, which visual treatment should Lane Warden use: A, B, or a hybrid?

Required categories:

1. Commander identity
2. Guard progress / regeneration threshold
3. Presence
4. ordinary unit health
5. Bastion urgency
6. Gate vulnerability

## Method

Each category is one paired block using the same underlying state and the same correct answer.

For every block:

1. Treatment A is shown and the player answers the category question.
2. Treatment B is shown and the player answers the same question.
3. A and B are then shown side-by-side.
4. The player chooses **A**, **B**, or **HYBRID** for that category.
5. An optional category note may describe what the hybrid should retain.

Presentation order alternates by category to reduce a systematic first-treatment learning advantage: A→B for Commander, Presence, and Bastion; B→A for Guard, ordinary health, and Gate.

No correctness feedback is shown until the test is complete.

## Metrics

Per recognition exposure:

- category
- treatment
- order within pair
- correct answer
- selected answer
- correct / incorrect
- response time

Per category:

- A / B / Hybrid preference
- optional hybrid/design note

The harness also records mobile layout samples and minimum answer-target dimensions.

## Acceptance / interpretation

This test does **not** require one treatment to win globally.

The test is decision-grade when:

- all 12 recognition exposures are completed;
- at least 11/12 recognition answers are correct;
- no category is missed under both treatments;
- all answer targets are at least 44 CSS pixels high and wide;
- no scored screen overflows the declared viewport.

Recognition time is descriptive evidence for each treatment and category. Preference is resolved category-by-category. A **HYBRID** choice is a valid intended outcome, not a failure to decide.

The resulting six category decisions form the battlefield information policy to carry into the Phone HUD test.

## Relationship to LW-T7-001

LW-T7-001 remains archived as diagnostic evidence. It produced 11/12 overall recognition, with A at 6/6 and a 6.976 s median, B at 5/6 and a 3.353 s median, equal crowding ratings, and a global B preference. The one B miss was Guard progress. Those results motivate paired per-category comparison rather than a universal A/B winner.
