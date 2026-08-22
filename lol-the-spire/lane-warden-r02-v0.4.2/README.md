# Lane Warden — R-02 Selectable Reform v0.4.2

**Build:** M1-0.4.2  
**Design baseline:** 1.7  
**Fixture:** R-02-STRUCTURAL  
**Parameter revision:** R02-C  
**Change under test:** REFORM-001

## Why this build exists

R02-B produced the intended three-lane fork: the middle push broke its Guard line while unattended North became a real Bastion clock. The same run also exposed a spawn-lock defect. The Rival was repeatedly incapacitated shortly after reforming into the dominant middle lane.

R02-C freezes R02-B combat pacing and isolates one rule change: **Commander reform anchors are selectable rather than fixed.**

## Player reform

When the player Commander is incapacitated:

- the lane strip becomes the reform selector;
- tapping North / Mid / South chooses the reform target;
- the chosen lane is visibly marked;
- the choice remains changeable until 2 seconds remain;
- the final 2 seconds are locked and telegraphed;
- reform does not consume Waypoint;
- there is no post-reform invulnerability.

## Rival reform

When the Rival is incapacitated it chooses among its enemy anchors using its existing macro score plus an anti-camp penalty for player forces already near an anchor. It can reevaluate once per second until 2 seconds remain. The exact target is hidden while undecided and becomes visible when locked.

Relevant telemetry:

- `commander-reform-target`
- `commander-reform-locked`
- `commander-reformed`
- `rival-reform-retarget`
- `rival-reform-locked`
- `rival-reformed`

## What is frozen from R02-B

Enemy pulse cadences and recipes, Bastion HP, Guard values, economy, intervention prices, Commander/Rival combat stats, Rival ordinary lane-choice scoring, and the three-lane deployment model remain unchanged from v0.4.1.

## First human check

Use **Middle temptation at 1×** again. The important evidence is whether a dominant middle push still creates the R02-B fork while Rival reform stops collapsing into repeated immediate deaths. If the player Commander dies, intentionally move its reform anchor at least once to verify the control grammar.

This remains exploratory and does not declare a formal Test 6/7/8 result.
