# Idle Pachinko Shootout — Prototype v0.3

Mobile-first playable vertical slice for **Idle Pachinko Shootout**: the pachinko board is the gun. Bullets have a property when they enter the board, can acquire additional properties from trick pegs, land in damage slots, and immediately become shots in the supernatural Western fight above.

## Playable now

- Automatic pachinko bullet physics with `10 | 7 | 4 | 2 | 1 | 2 | 4 | 7 | 10` damage slots.
- Timed cylinder/reload loop, enemy pressure, player HP/death, scaling waves, checkpoints, elites, and bosses.
- Persistent XP, Bounty Coins, hero upgrades, board upgrades, peg placement, and ammunition loadouts.
- Editable Fire, Splitter, Piercing, Dynamite, and Storm pegs.
- Vector gunslinger/monster art, muzzle flashes, tracers, hit reactions, death bursts, and special-peg feedback.

## v0.3 — configurable ammunition

Each chamber in the cylinder now has its own ammunition assignment. The Ammo Lab lets the player select a chamber, unlock ammunition blueprints, load any unlocked round into that chamber, and permanently tune specialty ammunition to recover some of its damage tradeoff.

| Round | Starting damage | Property |
|---|---:|---|
| Standard | 100% | No modifier; reliable baseline. |
| Golden | 88% | Killing blow awards 2× bounty coins. |
| Incendiary | 82% | Reduced impact plus three burn ticks. |
| Piercing | 82% | Additional targets retain 65% damage per penetration. |
| Dynamite | 75% | 50% / 25% splash to nearby enemies. |
| Storm | 72% | Reduced primary impact plus diminishing lightning jumps. |

Ammunition properties exist **before** the pachinko drop. Peg properties stack on top. Examples: an Incendiary round can hit a Dynamite Peg and become an incendiary blast; a Piercing round can pick up Storm and produce a rail-arc style shot; a Splitter duplicates the entire modified round at reduced damage.

Increasing cylinder capacity through **Deep Pockets** adds a new chamber loaded with Standard ammunition by default.

## Multi-target rules under test

- **Piercing:** 100% primary damage, then 65% retention per additional enemy: roughly `100 → 65 → 42 → 27`.
- **Explosive:** 100% primary damage, 50% to the adjacent enemy, 25% to the next enemy.
- **Chain Lightning:** reduced primary impact, first jump at 55% of base damage, then 62% retention on later jumps.
- **Burning:** reduced impact followed by three damage-over-time ticks.
- **Splitter:** creates two branches at 60% damage, with recursion capped.

## Milestone status

1. **Core pachinko → gunfight loop** — playable.
2. **Game-feel/art pass** — playable.
3. **Editable special-peg board** — playable.
4. **True ammunition loadouts** — **v0.3 playable**.
5. **Boss loot/buildcraft** — next: gun, hat, duster, boots, charm; side-by-side equip/sell decisions.
6. **Enemy identity** — abilities, resistances, elite affixes, and distinct boss mechanics.
7. **Idle layer** — offline progress plus balance/debug telemetry.

## Current playtest question

Does configuring the cylinder create meaningful choices between reliable single-target damage, economy, damage-over-time, and crowd clearing — and do ammunition + peg combinations feel like discoveries rather than merely stacked multipliers?
