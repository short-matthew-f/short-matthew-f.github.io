# Lane Warden — Test 7 Information Legibility v0.6.0

**Declaration:** LW-T7-001  
**Design baseline:** 1.7  
**Purpose:** Determine which strategic information must remain legible on the battlefield itself before production HUD work is layered on top.

## What this build tests

Twelve phone-scale recognition trials compare two visual treatments across the six Test 7 requirements:

- ordinary lane-unit health;
- Commander identification;
- Presence;
- Bastion urgency / `BastionCritical`;
- Guard regeneration threshold;
- Gate vulnerability.

Treatment A is a persistent/dense descriptive control. Treatment B is the causal/contextual candidate. The player sees only neutral A/B labels until the run is over.

## Candidate acceptance

Treatment B must be 6/6 correct with median recognition at or below 4 seconds, no more than one response over 6 seconds, at least 11/12 correct overall, no category missed twice, and clean phone layout with 44px minimum answer targets.

Crowding ratings and treatment preference are collected as descriptive evidence only.

## Why this is a static controlled lab

Test 7 asks about presentation rather than combat tuning. Static equivalent scene facts keep the independent variable limited to information treatment; live battle randomness cannot change the correct answer between A and B.

## Test 6 handoff

Test 6 is closed by explicit product-owner protocol exception after the 0.5.1 browser-channel run produced 8/8 correct, 2.47 s median recognition, zero slow responses, and zero camera-tax prompts. See the Test 6 build's `TEST6-CLOSEOUT.md` for the exception record.
