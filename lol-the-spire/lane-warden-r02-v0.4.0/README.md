# Lane Warden — R-02 Structural Spike v0.4.0

**Build:** M1-0.4.0  
**Design baseline:** 1.7  
**Fixture label:** R-02-STRUCTURAL  
**Parameter revision:** R02-A  
**Evidence status:** exploratory structural evidence only

## Question

Can the player preserve global strategic awareness and still make deliberate local interventions when three lanes and a Rival Commander compete for attention on the target phone?

## Source-backed structure carried into the spike

- three lanes;
- 8 Unit points / 6 tower points;
- authored junction travel rather than unconstrained diagonal lane changes;
- one shared Gate/Core with lane-specific approaches;
- Rival Commander with health, incapacitation, temporary loss of influence, reform at an enemy anchor, and no farmable reward by default;
- Rival marker in the global lane strip;
- ordered Guard-line data model and final-standing-Guard critical treatment;
- DET-001 fixed-step recovery carried forward from Test 0b;
- ATT-001 principle retained: inform/focus without automatic camera seizure.

## Deliberately exploratory R02-A choices

The exact lane recipes, pulse cadences, Guard-position counts, battlefield coordinates, Rival scoring weights, and combat numbers in this build are **not claimed to be the canonical authored R-02 encounter**. They exist to make the structural question runnable before those encounter-specific details are recovered/ratified.

The middle lane currently carries two ordered Guard positions solely to exercise the multi-position Guard-line model. The outer lanes use one each. This is a harness choice, not a design-baseline claim.

## Rival behavior

The Rival periodically chooses a lane from visible board state and exposes a readable intent/reason such as:

- exploiting the player's absence;
- contesting the strongest visible pressure;
- punishing an open breach.

The rule is intentionally transparent in this spike so human testing can answer whether the Rival creates an adversarial rotation problem instead of behaving like a high-HP mob.

## Human debrief

At battle end the build asks only exploratory questions:

- Could you track all three lanes?
- Did Rival movement change a rotation?
- Could you predict or bait the Rival at least once?

No preregistered Test 6/7/8 acceptance threshold is implied by those answers.

## Engineering

Recovery is integrated directly rather than layered through the v0.3.0 Blob/export wrappers. Export schema is `5`; the top-level build/fixture/tuning metadata therefore has one authoritative writer. Snapshot schema is `2` and includes Rival state, ordered Guard lines, Commander routes, actors, cooldowns, economy, deployment, and camera state.
