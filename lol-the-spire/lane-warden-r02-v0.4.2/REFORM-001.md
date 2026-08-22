# REFORM-001 — Selectable Reform Anchor

## Problem

R02-B exposed a spawn-lock failure mode. Once a lane became dominant, the Rival repeatedly reformed into the same lane and could be incapacitated again almost immediately. That turns Commander incapacitation from a bounded macro advantage into repeatable spawn camping.

## Rule

When either Commander is incapacitated, reform remains a timed absence but the reform lane is not fixed.

- The incapacitated side has a reform target lane.
- The reform target may change during the countdown until the final 2 seconds.
- During the final 2 seconds the target is locked and publicly telegraphed.
- Reform occurs at that lane's friendly anchor.
- Reform selection does not consume Waypoint or any other movement cooldown.
- No post-reform invulnerability is added.

### Player Commander

While incapacitated, tapping a lane in the global lane strip selects that lane as the reform target instead of merely focusing the camera. The selected reform lane is visibly marked and the objective copy reports the choice and remaining time.

If the player makes no selection, the lane in which the Commander was incapacitated remains the default reform target.

### Rival Commander

The Rival chooses a reform lane from its macro board evaluation with an additional anti-camp penalty for lanes containing player units or the player Commander near the enemy anchor. It may reevaluate once per second during the reform countdown until the final 2-second lock.

The exact Rival reform anchor is hidden while it is still choosing. The locked lane becomes visible during the final 2 seconds.

## Intended consequence

Incapacitation means: **the opposing Commander is absent for N seconds.**

It does not mean: **the opposing Commander will always return to the same campable location.**

This preserves the macro window while making reform itself another readable prediction problem.

## Status

Implemented experimentally in R02-C / v0.4.2 over otherwise frozen R02-B combat pacing. Not yet a formal acceptance rule.
