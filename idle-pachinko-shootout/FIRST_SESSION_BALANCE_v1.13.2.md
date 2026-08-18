# Idle Pachinko Shootout — First-Session Balance Contract (v1.13.2)

## Purpose

Milestone 3 is about deliberately shaping the first 30–60 minutes without reopening the v1.13 engine architecture. The opening should teach one concept at a time, make the first death productive, create a noticeably stronger second run, and build toward the first boss as a culmination rather than a sudden difficulty spike.

This file records the intended opening economy so future tuning does not accidentally destroy the sequence.

## Opening progression beats

1. Quick Draw introduction.
2. Hero lesson: first permanent Hero purchase is tutorial-funded.
3. Board lesson: first Board purchase is tutorial-funded.
4. Wave 4: guaranteed first field gear opportunity if ordinary field loot has not already appeared.
5. Wave 5: first checkpoint plus Incendiary blueprint/ammo lesson.
6. Wave 6: first Trailblazer bounty becomes claimable.
7. First death during the opening: one-time Last Stand Cache of **60 XP + 80 coins**.
8. Wave 8: Seismic Hammer blueprint is revealed.
9. Wave 8–9: save toward Seismic Hammer research and the first Tremor Peg.
10. Wave 10: first boss and guaranteed boss loot decision.
11. Wave 11: first stage cache and transition into Region 2.

## Economy baseline

The current authored Wave 1–10 reward formulas produce approximately:

| Through wave | Gross XP | Gross coins |
|---|---:|---:|
| 5 | 100 | 293 |
| 8 | 220 | 598 |
| 9 | 269 | 719 |
| 10 | 408 | 964 |

Hero and Board tutorial subsidies are intended to make the first teaching purchases economy-neutral rather than consuming resources the player earned afterward.

The Wave-5 Ammo lesson behaves differently: after Incendiary research, the tutorial supplies only the shortfall necessary to buy the first Incendiary round. On the expected guided path this leaves the wallet near zero after the lesson, creating a deliberate rebuild phase rather than a permanent subsidy.

After Waves 6–8 plus the first Trailblazer payout, a saver should have about **390 coins**. That is intentionally just short of the **420-coin Seismic Hammer research cost**.

By the end of Wave 9, the same no-death saver should have about **511 coins**, almost exactly the **420 research + 90 first Tremor Peg** package. This is the intended pre-boss build payoff.

If the player has already died once and preserved the 80-coin Last Stand Cache, Seismic research can become affordable during Wave 8, with the actual Tremor Peg becoming affordable after Wave 9. Both paths are acceptable:

- no early death: research + peg together late in Wave 9;
- early death: research at Wave 8, hardware at Wave 9.

## First-death rule

The first death in a fresh opening save awards **60 XP + 80 coins** exactly once.

The grant is not a tutorial subsidy. It is a progression reward whose job is to ensure that death teaches the roguelite loop: the next ride should immediately have at least one meaningful permanent upgrade available.

The grant is suppressed for migrated/progressed saves and after the opening has advanced beyond the first region.

## Workshop callouts

The first-session director tracks Seismic Hammer and the first Tremor Peg:

- when Seismic research first becomes affordable, Board is called out and the player receives a short `WORKSHOP FUNDED` message;
- once Seismic is researched and the first Tremor Peg becomes affordable, Board is called out again;
- buying the first Tremor Peg completes the opening workshop goal.

These are informational pacing cues, not locks. The player may spend differently.

## Telemetry

`ips-economy-telemetry-v1` records local-only balance data:

- run count;
- wave-clear wallet snapshots;
- first death timing;
- onboarding completion timing;
- first bounty claim;
- first gear equip;
- first boss loot;
- Seismic/Tremor funding milestones.

The DEV panel exposes the recent first-session summary. No personal data is collected or transmitted.

## Regression contract

`tools/smoke-v132-progression.mjs` intentionally asserts the major opening prices and reward checkpoints. If one of those numbers changes, CI should fail until the first-session sequence is explicitly re-evaluated.

The goal is not to freeze balance forever. The goal is to prevent accidental balance drift.
