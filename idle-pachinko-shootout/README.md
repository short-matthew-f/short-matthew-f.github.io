# Idle Pachinko Shootout — Prototype v0.4

Mobile-first playable vertical slice for **Idle Pachinko Shootout**: the pachinko board is the gun. Ammunition enters the board with properties, trick pegs can add more properties, the landing slot sets shot power, and boss victories now feed a persistent equipment build.

## Playable now

- Automatic pachinko bullet physics with `10 | 7 | 4 | 2 | 1 | 2 | 4 | 7 | 10` damage slots.
- Timed cylinder/reload loop, enemy pressure, player HP/death, scaling waves, checkpoints, elites, and bosses.
- Persistent XP and Bounty Coins.
- Permanent hero upgrades, editable trick pegs, and configurable per-chamber ammunition.
- Standard, Golden, Incendiary, Piercing, Dynamite, and Storm ammunition with stacking peg interactions.
- Vector combat art, muzzle flashes, tracers, hit reactions, death bursts, and peg feedback.
- **Boss loot with persistent gear buildcraft.**

## v0.4 — boss loot and gear

Every tenth wave is a boss. Defeating the boss pauses progression and presents a side-by-side comparison between the item currently equipped in that slot and the new drop. The comparison shows the actual stat change if the new item is equipped.

The two choices are deliberately explicit:

- **Equip New + Sell Old** — equip the drop and convert the replaced item into Bounty Coins.
- **Keep Current + Sell New** — keep the current build and sell the boss drop instead.

### Gear slots

| Slot | Typical effects |
|---|---|
| Gun | Base damage, critical chance |
| Hat | Critical chance, Bounty Coin bonus |
| Duster / Armor | Maximum HP, damage reduction |
| Boots | Reload speed, small damage bonus |
| Charm | Pachinko slot damage, specialty-ammo damage |

Bosses rotate through the five slots so a run naturally develops a complete loadout instead of repeatedly rolling only one category.

### Rarity ladder

`Common → Uncommon → Rare → Legendary → Mythic → Unique`

Higher boss tiers push the rarity floor upward. Unique items use authored names such as **The Widowmaker**, **Halo of the Last Marshal**, **Gravewind Duster**, **Hellspur Boots**, and **Saint Elmo’s Bullet**.

Gear effects are live immediately and persist across deaths/checkpoint restarts. Equipping a Duster that raises maximum HP also adjusts the current run's HP ceiling rather than waiting until the next death.

## Ammunition rules under test

| Round | Starting damage | Property |
|---|---:|---|
| Standard | 100% | Reliable baseline. |
| Golden | 88% | Killing blow awards 2× Bounty Coins. |
| Incendiary | 82% | Reduced impact plus three burn ticks. |
| Piercing | 82% | Additional targets retain 65% damage per penetration. |
| Dynamite | 75% | 50% / 25% splash to nearby enemies. |
| Storm | 72% | Reduced primary impact plus diminishing lightning jumps. |

Ammunition properties exist before the pachinko drop; board properties stack on top.

## Milestone status

1. **Core pachinko → gunfight loop** — playable.
2. **Game-feel/art pass** — playable.
3. **Editable special-peg board** — playable.
4. **True ammunition loadouts** — playable.
5. **Boss loot/buildcraft** — **v0.4 playable**.
6. **Enemy identity** — next: enemy abilities, resistances, elite affixes, and distinct boss mechanics.
7. **Idle layer** — offline progress plus balance/debug telemetry.

## Current playtest question

Do boss drops create a real “one more boss” pull, and are the equip/sell decisions readable enough to make a choice quickly while still understanding how the new item changes the build?
