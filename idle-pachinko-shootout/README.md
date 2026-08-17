# Idle Pachinko Shootout — Prototype v0.1

Mobile-first playable vertical slice for the Idle Pachinko Shootout concept.

## Playable in this build

- Automatic pachinko bullet physics.
- Damage slots: `10 | 7 | 4 | 2 | 1 | 2 | 4 | 7 | 10`.
- Five-round starting magazine and visible timed reload cycle.
- Enemy HP, distance pressure, attacks, player HP, death, and checkpoint restart.
- Scaling waves with checkpoint progression and a Wave 10 boss.
- Persistent XP and Bounty Coins in browser local storage.
- Live 80%-height Hero / Board / Ammo / Gear / Bounty sheets while the game keeps running.
- Hero upgrades for power, criticals, reload, magazine size, and health.
- Trick pegs for fire, splitting, piercing, explosive splash, and chain lightning.
- Boss loot comparison with equip-new or sell-new decision.

## Multi-target damage rules under test

These are deliberately diminishing so crowd-clearing rounds feel powerful without becoming strictly better than direct damage.

- **Piercing:** 100% primary damage, then 65% retention per additional enemy: roughly `100 → 65 → 42 → 27`.
- **Explosive:** 100% primary damage, 50% to the adjacent enemy, 25% to the next enemy.
- **Chain Lightning:** 78% primary impact, first jump at 55% of base damage, then 62% retention on later jumps.
- **Burning:** reduced impact followed by three damage-over-time ticks.
- **Splitter:** creates two branches at 60% damage, with recursion capped.

## Prototype goal

The first test is the core fantasy: **does watching pachinko balls acquire properties, land in damage slots, and immediately become gunshots feel satisfying enough to build the rest of the game around?**

## Next build targets

1. Replace emoji combatants with proper gunslinger / undead sprite assets and stage art.
2. Add muzzle flashes, trails, peg-hit effects, enemy hit reactions, and audio hooks.
3. Make trick-peg placement editable rather than fixed.
4. Add actual bullet loadouts: Golden, Piercing, Incendiary, Lightning, Explosive, etc.
5. Add enemy abilities, resistances, elite affixes, and distinct bosses.
6. Expand loot to hat, gun, armor/duster, boots, and charm slots with Common → Unique generation.
7. Add offline progress and a balance/debug telemetry panel.
