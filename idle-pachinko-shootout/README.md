# Idle Pachinko Shootout — Prototype v0.5

Mobile-first playable vertical slice for **Idle Pachinko Shootout**: the pachinko board is the gun. The current build now has three interlocking build layers — hero, pachinko/ammunition, and equipment — plus enemies that demand different answers instead of functioning as interchangeable HP bars.

## Playable now

- Automatic pachinko bullet physics with `10 | 7 | 4 | 2 | 1 | 2 | 4 | 7 | 10` damage slots.
- Timed cylinder/reload loop, enemy advance pressure, player HP/death, checkpoints, elites, and bosses.
- Persistent XP and Bounty Coins.
- Permanent hero upgrades and editable Fire / Splitter / Piercing / Dynamite / Storm pegs.
- Per-chamber Standard, Golden, Incendiary, Piercing, Dynamite, and Storm ammunition with stacking peg interactions.
- Boss gear in five slots with Common → Unique rarity, side-by-side comparison, equip/sell decisions, and live stat effects.
- Vector combat art, muzzle flashes, tracers, hit reactions, death bursts, ward bars, and readable enemy trait/affix badges.
- **Enemy-specific mechanics, resistances, weaknesses, elite affixes, and three rotating bosses.**

## v0.5 — enemy identity

The enemy type now changes what a good build looks like.

| Enemy | Trait | Mechanical consequence |
|---|---|---|
| Zombie Outlaw | **Deathless** | The first lethal hit makes it rise again at 22% HP unless the killing hit is Fire. |
| Ghoul Rustler | **Skitter** | Every second reload it rushes an extra range band before its normal advance. |
| Ghost Gunhand | **Spectral** | Plain shots deal only 55% damage. Special-property shots bypass the resistance; Storm/Chain damage is especially effective. |
| Troll Prospector | **Regeneration** | Heals 7% max HP each reload while wounded. Fire both deals bonus damage and suppresses the next regeneration. |

These traits are displayed directly above enemies so the game teaches its rules while running rather than hiding them in a codex.

### Elite affixes

Every fifth-wave elite can carry an additional visible affix:

- **Armored** — reduces non-explosive damage; Dynamite/Explosion bypasses the plating.
- **Quickdraw** — advances/attacks on a shorter cycle.
- **Frenzied** — below half HP it gains damage and speed.
- **Gravebound** — revives once at 32% HP unless finished with Fire.

Elite rewards are increased to compensate for the additional pressure.

## Rotating bosses

Bosses now rotate instead of every tenth wave being a larger copy of the same enemy.

### The Undertaker — Bone Ward

Starts with a ward equal to 30% of maximum HP. The ward must be stripped before HP damage lands; explosive damage is especially effective against it. At 50% HP the Undertaker enrages, attacking faster and harder.

### Widow Bell — Grave Toll

Every second reload she tolls the grave bell and can summon a **Wraith Deputy**. The adds are Spectral ghosts, forcing the player to decide whether to carry enough crowd/special ammunition to prevent the fight from snowballing.

### Iron Jack — Black Iron

Massive armor reduces ordinary damage. Explosive effects breach the plating and deal bonus damage, making Dynamite rounds and pegs a deliberate boss-tech choice rather than generic crowd clear.

## Build interactions now possible

Examples of the intended decision pressure:

- A Standard-heavy cylinder is excellent efficient damage, but performs poorly into a Ghost wave.
- Incendiary ammunition can permanently solve Troll regeneration and stop Deathless/Gravebound revivals.
- Dynamite is less efficient against a single normal enemy but becomes premium against Armored elites and Iron Jack.
- Storm ammunition pays a base-damage tax but becomes the clean answer to Spectral enemies and multi-target waves.
- Equipment can push a build toward specialty ammo, reload speed, survivability, bounty farming, crits, or raw slot damage.

## Boss loot / gear

Every tenth wave still pauses for a boss drop. The player sees the currently equipped item and the new item side by side, including exact stat deltas, then chooses:

- **Equip New + Sell Old**, or
- **Keep Current + Sell New**.

Gear slots: Gun, Hat, Duster, Boots, Charm. Rarity: `Common → Uncommon → Rare → Legendary → Mythic → Unique`.

## Milestone status

1. **Core pachinko → gunfight loop** — playable.
2. **Game-feel/art pass** — playable.
3. **Editable special-peg board** — playable.
4. **True ammunition loadouts** — playable.
5. **Boss loot/buildcraft** — playable.
6. **Enemy identity** — **v0.5 playable**.
7. **Idle layer** — next: offline progress, return summary, and balance/debug telemetry.

## Current playtest question

Do enemy traits make you look at the incoming wave and care about what is in the cylinder/board, or do they feel like chores? The target is **counterplay that rewards having built a toolbox**, not hard immunities that invalidate a build.
