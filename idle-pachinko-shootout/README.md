# Idle Pachinko Shootout — Prototype v0.2

Mobile-first playable vertical slice for **Idle Pachinko Shootout**: the pachinko board is the gun. Bullets bounce through a configurable board, acquire properties, land in damage slots, and immediately become shots in the supernatural Western fight above.

## Playable now

- Automatic pachinko bullet physics.
- Damage slots: `10 | 7 | 4 | 2 | 1 | 2 | 4 | 7 | 10`.
- Five-round starting cylinder and visible timed reload cycle.
- Enemy HP, advance pressure, attacks, player HP, death, scaling waves, checkpoints, and a Wave 10 boss.
- Persistent XP and Bounty Coins in browser local storage.
- Live Hero / Board / Ammo / Gear / Bounty sheets while the game keeps running.
- Hero upgrades for damage, critical chance, reload speed, cylinder size, and maximum HP.
- Trick pegs for fire, splitting, piercing, explosive splash, and chain lightning.
- **Editable trick-peg placement:** buy a special peg, choose PLACE/MOVE in the Board sheet, then tap the physical peg on the live board to convert it. Placement persists.
- Vector gunslinger and monster art replacing emoji combatants.
- Muzzle flashes, shot tracers, enemy hit reactions, death bursts, and special-peg impact rings.
- Elite waves at multiples of 5 and bosses at multiples of 10.

## Multi-target damage rules under test

Crowd-clearing rounds deliberately lose damage as they spread so they do not become strictly better than direct damage.

- **Piercing:** 100% primary damage, then 65% retention per additional enemy: roughly `100 → 65 → 42 → 27`.
- **Explosive:** 100% primary damage, 50% to the adjacent enemy, 25% to the next enemy.
- **Chain Lightning:** 78% primary impact, first jump at 55% of base damage, then 62% retention on later jumps.
- **Burning:** reduced impact followed by three damage-over-time ticks.
- **Splitter:** creates two branches at 60% damage, with recursion capped.

## Milestone status

1. **Core pachinko → gunfight loop** — playable.
2. **First game-feel/art pass** — v0.2.
3. **Editable special-peg board** — v0.2.
4. **True ammunition loadouts** — next: magazine composition, Golden/Piercing/Incendiary/Lightning/Explosive bullets, bullet rarity and ammunition upgrades.
5. **Enemy identity** — abilities, resistances, elite affixes, and distinct boss mechanics.
6. **Loot buildcraft** — hat, gun, duster/armor, boots, and charm slots with Common → Unique generation and boss comparison decisions.
7. **Idle layer** — offline progress plus balance/debug telemetry.

## Current test question

The first question was whether pachinko resolving directly into gunfire is satisfying. v0.2 adds a second: **does choosing where special pegs live turn the board into a build rather than merely a random-number generator?**
