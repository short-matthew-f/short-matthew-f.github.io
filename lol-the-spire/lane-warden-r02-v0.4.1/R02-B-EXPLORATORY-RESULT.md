# Lane Warden R-02 — R02-B Exploratory Result

**Run:** 2026-08-22  
**Build:** M1-0.4.1  
**Fixture / revision:** R-02-STRUCTURAL / R02-B  
**Result:** win at 179.80 s, Core 77%  
**Disposition:** intended three-lane fork achieved; spawn-lock defect exposed

## Fork evidence

The player stayed committed to the concentrated middle plan rather than chasing the Rival around the map.

- Middle Guard position 0 broke at **97.70 s**.
- North Bastion warning fired at **108.80 s**.
- Middle Guard position 1 and the full middle Guard line broke at **119.27 s**.
- North Bastion became critical at **143.07 s**.
- North Bastion broke at **165.33 s**.
- Gate victory arrived at **179.80 s** with **77% Core** remaining.

The debrief was:

- `globalRead=yes`
- `rivalChanged=no`
- `rivalPredict=yes`

That is useful evidence for the intended R-02 macro question. The Rival remained readable and predictable, but the player judged the winning middle lane more valuable than following it. This is qualitatively closer to the desired "not the fight — the fork" behavior than R02-A, where Rival movement repeatedly pulled Commander rotations.

## Pressure correction worked

R02-A left outer Bastions almost untouched through 130 seconds. R02-B created a real unattended-lane clock while preserving offensive progress in Mid.

At snapshot time:

- 100 s: North Bastion 82%, first Mid Guard already broken.
- 110 s: North 74%, second Mid Guard 36%.
- 120 s: North 63%, Mid Guard line broken.
- 140 s: North 39%, Gate 81%.
- 160 s: North 9%, Gate 47%.
- 170 s: North broken, Gate 29%, Core 96%.

This is the first R-02 run to demonstrate a legible offensive-versus-neglect race.

## Rival behavior improved

Ordinary Rival decisions no longer collapsed to one repeated reason. The run included:

- `holding valuable local pressure`
- `contesting your winning pressure`
- the initial `exploiting your absence`

The player reported `rivalPredict=yes`, suggesting the opponent was readable enough to anticipate without dictating the response.

## Spawn-lock defect

The run also exposed a distinct Commander-lifecycle problem. The Rival was incapacitated **8 times**. Once Mid became dominant, several reforms were followed by another incapacitation only a few seconds later:

- reformed 124.77 → incapacitated 126.98 (**2.21 s**)
- reformed 138.98 → incapacitated 141.88 (**2.90 s**)
- reformed 153.88 → incapacitated 156.88 (**3.00 s**)
- reformed 168.88 → incapacitated 171.87 (**2.99 s**)

This is not best solved by adding HP or invulnerability. The problem is that reform location is too predictable/campable once a lane is dominant.

## Next change

R02-C isolates **REFORM-001: selectable reform anchor** over otherwise frozen R02-B combat pacing.

Both Commanders may change reform lane during the countdown until a final 2-second lock. The Rival additionally avoids anchors already occupied by overwhelming player pressure. No post-reform invulnerability is added.
