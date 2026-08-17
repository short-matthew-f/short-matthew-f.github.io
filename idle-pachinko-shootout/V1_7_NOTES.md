# v1.7 — Enemy-Bound Status Effects & Specialty Rounds

## Why this milestone changed
A playtest exposed a correctness bug in the original Incendiary implementation: burn damage was scheduled by the projectile, and each delayed tick looked up the **current** primary target. If the original victim died or the wave changed, remaining burn ticks could jump to an unrelated enemy.

The rule is now explicit:

> **A projectile may create an effect, but after impact the effect belongs to an enemy or a battlefield location.**

No lingering effect is allowed to retarget itself just because combat state changed.

## Status-effect architecture

### Burn
- Burn instances are stored on the enemy that was actually hit.
- Each hit carrying the Fire property can create its own three-tick burn.
- Multi-target projectiles can therefore ignite multiple enemies, but each burn remains attached to its own victim.
- Burn state disappears naturally when that enemy dies or the wave is replaced.
- Troll regeneration remains blocked by fire as before.

### Concussion
- Concussion is stored as `stunUntil` on each enemy actually struck.
- A stunned enemy cannot advance or attack.
- Repeated concussion refreshes/extends the current stop window rather than creating free-floating timers.
- Base stun: **1.4 seconds**.
- Each Concussive ammo tuning rank adds **0.25 seconds**, capped at **3.4 seconds**.

### Poison Cloud
- Clouds belong to the battlefield, not to a projectile or target.
- A cloud records its impact position, lane, radius, tick damage, and expiry.
- Enemies in the same or neighboring lane take damage while moving through the cloud's horizontal zone.
- Clouds are explicitly cleared on wave transition, so a cloud cannot leak into the next encounter.
- Base lifetime: **5 seconds**.
- Poison ammo tuning adds **0.5 seconds per rank**, capped at +3 seconds.

## New ammunition

### Concussive Round
**20% base damage.**

Every enemy actually hit is stopped for a short time. If a Concussive round later gains Piercing, Dynamite, or Chain properties from the board, the secondary enemies it genuinely hits are also concussed.

This is a control round, not a damage round. Its value rises when enemies are close to cover or when reload timing is dangerous.

**First blueprint:** Clear Wave 12 — `CONCUSSION DIES` — Research 900 coins.

### Shrapnel Round
**60% starting damage + 10% for every peg collision before the ball resolves.**

The ball now counts every peg it actually touches. The count travels with the ball and is inherited by Splitter branches. Each branch can then continue collecting additional shrapnel independently.

Examples before slot/crit/other properties:
- 0 pegs: 60%
- 4 pegs: 84%
- 7 pegs: 102%
- 10 pegs: 120%
- 15 pegs: 150%

This intentionally makes long, chaotic pachinko paths valuable. A direct fall is bad for Shrapnel; a pinballing route is excellent.

**First blueprint:** Clear Wave 18 — `SHRAPNEL LOADER` — Research 1,500 coins.

### Poison Cloud Round
**35% impact damage.**

Impact creates a visible poison cloud. The cloud ticks every 0.5 seconds and can damage any enemy passing through its zone. Its damage is based on the payload that created it, so other projectile properties can produce meaningful combinations.

The initial tuning aims for the cloud plus direct hit to approach a normal round's single-target value only if the victim remains exposed for most of the cloud duration; the upside is that other enemies can also cross the hazard.

**First blueprint:** Clear Wave 26 — `MIASMA CAPSULE` — Research 2,600 coins.

## Property combinations
The new rounds remain compatible with the central rule that ammo properties exist before the drop and peg properties are added during the drop.

Interesting combinations to watch:

- **Concussive + Piercing** — a low-damage control line through several enemies.
- **Concussive + Chain** — broad crowd control at very low single-target efficiency.
- **Shrapnel + Splitter** — branches inherit all shrapnel already collected, then can accumulate more separately.
- **Shrapnel + Piercing** — long board path converts into a high-energy penetrating shot.
- **Poison + Piercing** — piercing damage continues through the line, while the cloud remains at the primary impact zone.
- **Poison + Dynamite** — immediate area damage plus a lingering denial zone.
- **Incendiary + any multi-target property** — every enemy actually hit can burn, but no burn ever transfers targets.

## Visual feedback
v1.7 adds:
- STUNNED and BURNING enemy badges,
- a visible concussion jitter/star effect,
- persistent poison-cloud battlefield art,
- distinct tracer colors for Concussive, Poison, and Shrapnel rounds,
- queue/chamber glow treatments for the new ammo families.

All new animation respects `prefers-reduced-motion`.

## First balance questions
1. Is 1.4 seconds enough for Concussive to be tactically visible without becoming a permanent stun lock?
2. Does the 20% damage floor make Concussive feel like a meaningful sacrifice?
3. How many peg collisions does a typical ball actually collect on the live board? That determines whether Shrapnel's 60% + 10%/peg curve is correct.
4. Does Poison Cloud catch enough secondary enemies to feel spatial rather than merely behaving like another DoT?
5. Should poison affect Spectral enemies normally, partially, or not at all? v1.7 currently lets their existing phase resistance reduce poison damage.
