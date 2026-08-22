# Lane Warden — R02-B Rotation Pressure v0.4.1

**Build:** M1-0.4.1  
**Design baseline:** 1.7  
**Fixture:** R-02-STRUCTURAL  
**Parameter revision:** R02-B  
**Evidence status:** exploratory human-test candidate; not canonical R-02 balance

R02-A produced a useful first structural run. It showed that Rival movement changed player rotations and that concentration could drive a Guard line below replacement, but the neglected outer lanes stayed effectively safe and every Rival decision collapsed to the same `exploiting your absence` rule.

R02-B changes only those exposed weaknesses:

- North enemy cadence 22 → 18 s; recurring North pulse gains one Bowhand.
- South enemy cadence 26 → 22 s; recurring South pulse gains one Raider.
- Bastion HP 17,000 → 14,000 to move the unattended clock toward the 80–110 s validation hypothesis.
- Rival absence score 12 → 5.
- Rival now values damaged Guard lines and Bastion damage explicitly.
- Rival uses a 4-point hold margin so near-ties do not force lane ping-pong.
- Rival reason text distinguishes contesting winning pressure, exploiting absence, punishing a breach, and holding local value.
- Rival reforms at the highest-value enemy anchor rather than always in Mid.
- Tower-destruction export telemetry is corrected so the event remains `tower-destroyed` and the archetype is `towerType`.
- Recovery storage is isolated under the M1-0.4.1 / R02-B namespace.

Everything else remains the R02-A structural spike: three lanes, 8 Unit / 6 tower capacity, authored junction routing, ordered Guard-line state, lane-strip Commander markers, ATT-style offscreen focus, and integrated fixed-step recovery.

## First-run question

Use **Middle temptation** again at **1×** if possible. The highest-value comparison is whether the same concentrated plan now creates a fork:

> Mid is finally winning, but an outer Bastion and/or Rival rotation has become costly. Do you follow the Rival, rescue the threatened lane, or stay with the breach attempt?

The useful result is not necessarily a win. Export once the battle resolves, or once a clear fork has played out if the battle is obviously stalled.
