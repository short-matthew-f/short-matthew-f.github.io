# R-01 Twin Toll — Parameter Set A

**Build:** M0-0.2.0  
**Design authority:** 1.7  
**Status:** exploratory tuning revision, not a design baseline amendment.

This revision exists to make the first two-lane gameplay slice reproducible enough to inspect. Exact combat numbers remain tuning hypotheses.

## Fixed for this revision

- Two lanes.
- 6 Unit points / 4 Tower points.
- Player pulse cadence: 13.5 s.
- Enemy pulse cadence: North 14.0 s; South 12.5 s.
- Guard: 900 HP, 14 HP/s regeneration while alive.
- Bastion: 1,100 HP; no Bastion offense.
- Core: 1,450 HP, no regeneration.
- Gate: 2,300 HP; shield latches open after either Guard line breaks.
- Presence radius: 13 world units.
- Presence allied-damage multiplier: 1.28×.
- Gold per enemy kill: 8 local / 3 remote.
- Initial battle gold: 60.
- Rally: 7 s active, 22 s cooldown, 1.32× local allied damage.
- Waypoint: 45 s cooldown.
- Commander reform: 9 s after incapacitation.

## What this revision is trying to expose

1. Token pressure in both lanes should visibly read as below replacement.
2. A serious structural package should be able to create net Guard progress.
3. The South lane's slightly faster enemy cadence should become a bounded clock rather than instant failure.
4. Sixty starting gold should make an early one-action fork legible: accelerate a committed wave with **Push**, or amplify existing tower defense with **Overdrive**.
5. A player should be able to inspect the other lane immediately without moving the Commander there.

No pass/fail thresholds are declared yet. The first phone runs are exploratory and should determine what needs formal preregistration.
