# Lane Warden — Test 6 Global Awareness v0.5.1

**Declaration:** LW-T6-001 (criteria unchanged)  
**Gameplay base:** M1-0.4.3 / R02-D over R02-C parameters  
**Fixture:** R-02-STRUCTURAL / R02-C  
**Purpose:** rerun Test 6 after the first 0.5.0 human result exposed readability failures in opening orientation, Bastion comparison, and threat-lane ownership.

## What changed

Only the presentation/readability layer changed:

- opening lane-strip legend for `◆ YOU`, `✦ RIVAL`, and friendly front;
- visible lane name attached to active threat severity badge plus matching lane-strip outline;
- Bastion remaining-state bars and uniquely-shortest-clock emphasis.

See `INTERVENTION.md` for the exact intervention boundary.

## What did not change

The frozen LW-T6-001 scoring harness is loaded from v0.5.0 and version-stamped as T6-0.5.1. Prompt plan, question wording, response timing, camera-tax instrumentation, thresholds, deployment, simulation speed, gameplay runtime, and lane-strip outer geometry are unchanged.

## Test procedure

Install/run this folder as the standalone PWA on the declared iPhone 15 Pro target, use the locked Middle temptation deployment at 1×, answer all eight live prompts by tapping NORTH / MID / SOUTH, then export **TEST 6** evidence. Compare the resulting T6-0.5.1 JSON directly against the prior T6-0.5.0 result.

The original declaration is preserved alongside this build. Its `Harness build: T6-0.5.0` line is intentionally historical; `INTERVENTION.md` records why the same declaration is being rerun on the revised presentation build.
