# LW-T10-001 — Test 10 Last Stand Presentation

**Status:** DECLARED — thresholds frozen before human execution  
**Declared:** 2026-08-22  
**Design baseline:** 1.7  
**Harness build:** T10-0.9.0

## Question

Does defeat still feel like a dramatic forward-moving event?

## Required sequence content

Both presented sequences must visibly include:

1. loss realization / Core fall;
2. Warden Last Stand escalation;
3. Bulwark Detonation destroying the Gate;
4. Ember consequence;
5. transition onward or run-end.

The payable sequence must also communicate that the normal battle reward is not granted and that defeat value may still be preserved as salvage/near-miss context.

The terminal sequence must still play the Last Stand spectacle before the run-end state.

## Test scenes

### Sequence A — payable defeat

- Warden begins with 3 Embers.
- Core falls.
- Bulwark Detonation destroys the Gate.
- 1 Ember is spent: 3 → 2.
- No normal battle reward.
- Salvage/near-miss context is shown.
- Run advances.

### Sequence B — terminal defeat

- Warden begins with 0 Embers.
- Core falls.
- Bulwark Detonation still destroys the Gate as the run-end set piece.
- No Ember can be paid.
- No normal battle reward.
- Run ends after the spectacle.

## Metrics

After each sequence the player answers five unprompted comprehension questions covering:

- Core outcome;
- Gate outcome;
- Ember consequence;
- normal reward availability;
- next run state.

After both sequences the player answers emotional/presentation questions covering:

- payable defeat reads as forward motion rather than victory or a consolation animation;
- terminal defeat reads as an authored run-end set piece rather than an abrupt defeat modal;
- Warden / Bulwark Detonation identity is recognizable;
- presentation is readable on the phone;
- the sequence feels dramatic/memorable enough to carry failure framing.

The harness records playback completion, orientation, standalone mode, interruptions and answers.

## Acceptance thresholds

All must hold:

1. Both sequences play to completion before their quiz is answered.
2. **10/10 critical comprehension answers correct.**
3. Payable defeat is classified as **costly forward motion** rather than victory, ordinary loss, or consolation-only animation.
4. Terminal defeat is classified as **deliberate run-end set piece** rather than abrupt defeat modal or continued run.
5. Player answers YES that Warden identity / Bulwark Detonation is clear.
6. Player answers YES that the sequence is readable at phone scale.
7. Player answers YES that the presentation feels dramatic/memorable enough for the game's failure framing.
8. Standalone PWA and landscape throughout scored playback.
9. No background/visibility interruption during either scored playback.

Any failure is a FAIL for this presentation treatment. Visual polish may be revised, but the comprehension threshold must not be weakened after evidence is collected.
