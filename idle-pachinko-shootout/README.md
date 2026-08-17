# Idle Pachinko Shootout — Prototype v0.6

Mobile-first playable vertical slice for **Idle Pachinko Shootout**. The pachinko board is the gun: ammunition enters with properties, trick pegs modify it, landing slots set shot power, enemies demand different counters, bosses award persistent equipment, and the game now continues to make limited progress while the player is away.

## Playable now

- Automatic pachinko bullet physics with `10 | 7 | 4 | 2 | 1 | 2 | 4 | 7 | 10` damage slots.
- Timed cylinder/reload loop, enemy advance pressure, HP/death, checkpoints, elites, and rotating bosses.
- Persistent XP and Bounty Coins.
- Permanent hero upgrades and editable Fire / Splitter / Piercing / Dynamite / Storm pegs.
- Per-chamber Standard, Golden, Incendiary, Piercing, Dynamite, and Storm ammunition with stacking peg interactions.
- Boss gear in five slots with Common → Unique rarity and side-by-side equip/sell decisions.
- Enemy-specific mechanics, resistances, weaknesses, elite affixes, boss phases, and readable combat badges.
- **Offline patrol earnings, return summary, and prototype balance telemetry.**

## v0.6 — the idle layer

The game records when the player was last active. After at least two minutes away, reopening or resuming the game calculates a conservative **offline patrol** from the last secured checkpoint.

Offline patrols can award Gunslinger XP, Bounty Coins, and a summary estimate of patrol skirmishes completed while away. They **cannot** advance the current wave/checkpoint, defeat or skip bosses, generate boss equipment, or make equip/sell choices. Idle time advances the economy but never consumes the decisions that are supposed to pull the player back into active play.

### Offline rate

The current prototype rate uses the secured checkpoint as the main progression anchor, with a modest bonus from permanent hero upgrades, ammunition tuning, special pegs, and equipped gear. It is deliberately much slower than active play and capped at **8 hours per return**.

There is a two-minute grace period so briefly switching apps does not generate noisy return screens. If a suspended mobile tab becomes active after more than two minutes, the prototype reloads once to reconcile the offline reward safely with the live game save.

## Return summary

The return screen reports real time away, secured checkpoint, estimated patrol skirmishes, XP earned, Bounty Coins earned, and whether the 8-hour cap was reached. The live game continues immediately after dismissing the summary.

## Prototype telemetry

A small **DEV** button in the top bar opens a tester-facing telemetry panel. This is not intended as final-player UI. It reports current wave/HP, session duration, wave transitions and waves/minute, reload cycles, deaths, boss loot screens, checkpoint/highest wave, estimated offline rates, lifetime offline rewards, cylinder composition, equipped gear, aggregate prototype play time, and best observed wave.

Telemetry is stored locally in the browser. **RESET TELEMETRY ONLY** clears those measurements without deleting game progression.

## Enemy identity retained from v0.5

| Enemy | Trait | Mechanical consequence |
|---|---|---|
| Zombie Outlaw | **Deathless** | Revives once unless finished with Fire. |
| Ghoul Rustler | **Skitter** | Periodically rushes an extra range band. |
| Ghost Gunhand | **Spectral** | Resists plain shots; Storm/Chain is especially effective. |
| Troll Prospector | **Regeneration** | Heals between reloads unless Fire suppresses regeneration. |

Elite affixes remain **Armored, Quickdraw, Frenzied, and Gravebound**. Bosses rotate among **The Undertaker**, **Widow Bell**, and **Iron Jack**, each with distinct counterplay.

## Milestone status

1. **Core pachinko → gunfight loop** — playable.
2. **Game-feel/art pass** — playable.
3. **Editable special-peg board** — playable.
4. **True ammunition loadouts** — playable.
5. **Boss loot/buildcraft** — playable.
6. **Enemy identity** — playable.
7. **Idle layer** — **v0.6 playable**.

## Current playtest questions

The main v0.6 questions are whether coming back to a useful pile of resources feels rewarding without trivializing active play, whether the 8-hour cap is generous enough, and whether progression starts to feel like a satisfying loop of **return → improve build → push farther → secure a better checkpoint → earn faster while away**.

The telemetry panel exists so those answers can turn into concrete balance changes rather than guesses.
