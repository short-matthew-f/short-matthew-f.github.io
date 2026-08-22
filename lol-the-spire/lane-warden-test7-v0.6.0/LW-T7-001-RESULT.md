# LW-T7-001 — Result

**Observed:** 2026-08-22
**Build:** T7-0.6.0
**Disposition:** DIAGNOSTIC EVIDENCE RETAINED — DESIGN DECISION SUPERSEDED BY LW-T7-002

## Quantitative result

- 12/12 trials completed
- 11/12 correct overall
- Treatment A: 6/6 correct, 6.976 s median
- Treatment B: 5/6 correct, 3.353 s median
- Treatment B error: Guard net-progress identification
- crowding rating: A 3 / B 3
- global preference: B
- phone layout: pass

The preregistered T7-0.6.0 candidate verdict was FAIL because Treatment B did not achieve 6/6 recognition.

## Human-test finding

The test format did not support a useful apples-to-apples design comparison. A and B were encountered on different categories at different times, so the player could not directly compare the two treatments for the same information problem. The global A/B preference also forced a false choice: the preferred battlefield policy may mix treatments by category.

## Consequence

Do not use this result to choose one universal treatment.

LW-T7-002 / T7-0.6.1 replaces the decision method with six paired comparisons. For each category the same battlefield state is shown under A and B, followed immediately by a side-by-side A / B / Hybrid choice.
