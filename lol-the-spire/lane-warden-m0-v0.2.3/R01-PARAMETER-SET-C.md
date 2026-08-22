# Lane Warden M0.2.3 — R-01 Parameter Set C

**Design baseline:** 1.7  
**Fixture:** R-01 — Twin Toll  
**Status:** Exploratory pacing/consequence candidate. DL-001 decision-legibility UX is frozen.

## Rationale

R01-B established a useful human decision story under informed play, but the successful Siege + delay battle resolved in only 186.6s and ended with ~64% Core remaining. R01-C targets battle duration and sacrifice consequence **without slowing movement, unit-vs-unit combat, pulse cadence, gold cadence, or the Twin Toll enemy script**.

The pacing lever is structural throughput, but the deployed browser represents it through **equivalent effective durability** so the proven v0.2.2 `main.js` can remain byte-identical. A conceptual 0.6× damage-to-structures multiplier is mathematically equivalent to multiplying the affected structure durability by 1/0.6. Guard regeneration is represented at the corresponding unscaled 14/s, preserving exactly the same damage-vs-regeneration relationship. Tower HP is scaled by the tiny `r01c-runtime-adapter.js`; tower outgoing damage is unchanged.

## R01-C values

| Parameter | R01-B | R01-C |
| --- | ---: | ---: |
| Player pulse cadence | 20s | 20s |
| Guard HP | 1100 | **7666.67 effective** |
| Guard regeneration | 14/s | **14/s effective** |
| Gate HP | 5200 | **25000 effective** |
| Bastion HP | 2200 | **15000 effective** |
| Core HP | 5400 | **10833.33 effective** |
| Friendly structural throughput | 1.0× | **0.6× conceptual / durability-equivalent runtime** |
| Enemy structural throughput | 1.0× | **0.6× conceptual / durability-equivalent runtime** |
| Tower durability | 1.0× | **1.6667×** |
| Siege Ram HP / structure identity | 450 / 5.0× | unchanged |
| Gold / intervention rules | R01-B | unchanged |
| Twin Toll cadence/packages | R01-B | unchanged |

All other R01-B parameters remain unchanged.

## Deterministic reference row

Using the existing fixed reference policies at 1× simulation:

- **Balanced:** win ~406s (~6:46).
- **Siege + delay:** win ~312s (~5:12); North Guard ~214s; South Bastion ~265s; Gate ~47s later; Core ~7.6% remaining.
- **All-in:** win ~232s (~3:52); South Bastion is visibly critical (~35%) but does not necessarily break before the fast close.
- **Thin:** no Guard breach within 600s.

The same Siege + delay state continued against an effectively unreachable Gate loses the conceptual fresh 6500-HP Core (10833.33 effective runtime HP) roughly **50.6s after the South Bastion falls**, close to the design baseline's 30–50s starting hypothesis and suitable for human testing.

## What this row is testing

- Whether the validated R01-B decision arc still feels clear when stretched across more macro cycles.
- Whether an ordinary Siege + delay battle lands around the lower edge of the 5–10 minute target rather than ~3 minutes.
- Whether losing the sacrifice Bastion creates a genuinely dangerous Core race.

## Not claimed

- Shipping balance.
- Independent teaching/discoverability of the sacrifice thesis.
- That All-in, Balanced, and Siege + delay have final relative power.
- Formal 5–10 minute acceptance across a representative encounter corpus.
