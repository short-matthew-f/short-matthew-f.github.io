# Lane Warden R-02 — R02-C / REFORM-001 Exploratory Result

**Run:** 2026-08-22  
**Build:** M1-0.4.2  
**Parameter revision:** R02-C  
**Disposition:** REFORM-001 behavior worked in human play; attention affordance exposed a separate UX defect

## Reform evidence

The run exercised both sides of selectable reform.

### Rival

First incapacitation:

- Rival incapacitated at 62.93 s.
- Initial reform target was North.
- At 68.02 s the Rival retargeted North → South while Mid carried a camp-risk score of 12 and North/South were 0.
- South locked at 72.95 s with 1.98 s remaining.
- Rival reformed South at 74.95 s.

This is the intended anti-camp behavior: the Rival was not forced to return to the dominant Mid fight.

Second incapacitation:

- Rival incapacitated at 110.95 s.
- South locked at 120.97 s.
- Rival reformed South at 122.97 s.

### Player Commander

- Commander was incapacitated in South at 87.08 s with South as the initial reform target.
- Player selected North at 89.57 s with 6.52 s remaining.
- North locked at 94.10 s with 1.98 s remaining.
- Commander reformed North at 96.10 s.

This directly exercises the player-side rule: reform destination can be changed during downtime and locks only near arrival.

## Gameplay continuity

The run continued the frozen R02-B pressure model:

- Mid first Guard position broke at 112.80 s.
- Mid Guard line broke at 142.45 s.
- North Bastion entered warning at 111.02 s.
- No Waypoint was used.
- The export occurred during the active battle at about 143 s, so there is no battle-end result or debrief.

## New UX finding: attention marker

Human feedback after the run reported that the upper-left danger/attention icon was basically impossible to see or click. Telemetry recorded zero `attentionFocus` taps during the run.

This is treated as a presentation/input-discoverability defect rather than a failure of REFORM-001. The next build, R02-D / ATT-002, replaces the old edge affordance with a safe-area circular `!` severity badge using grey/yellow/orange/red urgency and a larger tap target.

## Disposition

REFORM-001 has useful positive exploratory evidence on both Rival and player paths. It is not declared a formal pass because no preregistered acceptance threshold was attached to this run.
