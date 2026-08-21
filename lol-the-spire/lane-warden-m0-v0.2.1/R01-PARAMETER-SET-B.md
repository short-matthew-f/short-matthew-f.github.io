# Lane Warden M0.2.1 — R-01 Parameter Set B

**Design baseline:** 1.7  
**Fixture:** R-01 — Twin Toll  
**Status:** Exploratory human-test candidate. These values are tuning hypotheses, not design authority.

## Fixture correction

Twin Toll is now represented as the intended asymmetric teaching script:

- **North:** first pulse at ~0.5s with 3 Raiders; then 2 Raiders + 1 Bowhand every ~20s.
- **South:** first pulse at ~10s with 2 Raiders; then 2 Raiders + 1 Rammer every ~28s.
- No Rival Commander in Act 1.

`config.js` is shared by the browser runtime and deterministic simulator so fixture topology cannot silently drift between them.

## R01-B tuning candidate

| Parameter | R01-B |
| --- | ---: |
| Player pulse cadence | 20s |
| Guard HP | 1100 |
| Guard regeneration | 14 / s |
| Gate HP | 5200 |
| Bastion HP | 2200 |
| Core HP | 5400 |
| Siege Ram HP | 450 |
| Siege Ram structural multiplier | 5.0× |
| Presence-local kill gold | 5g |
| Remote kill gold | 2g |
| Starting gold | 60g |
| Intervention cost | 60g |
| Shared Push/Overdrive cooldown | 20s |
| Push | one temporary copy of each type already committed to selected lane |
| Overdrive | 18s at 1.8× tower output |

Other Commander/tower values remain the prior exploratory values for this pass.

## Why this row is being human-tested

A deterministic reference policy currently produces useful **spread**, not equality:

- Balanced can close while keeping both Bastions intact.
- All-in can close quickly but knowingly abandons South.
- Siege + delay can close after the South Bastion breaks and with the Core nearly exhausted.
- Thin pressure cannot break either Guard within a 10-minute probe.

That is sufficient to justify a human decision-quality pass. It is **not** sufficient to call R01-B balanced. In particular, deterministic wins remain shorter than the 5–10 minute ordinary-battle target.
