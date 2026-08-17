# Idle Pachinko Shootout — v1.0 Playtest Candidate

Mobile-first playable build of **Idle Pachinko Shootout**. The pachinko board is the gun: ammunition enters with properties, trick pegs modify it, landing slots set shot power, enemies pressure the Gunslinger during reloads, deaths preserve progression, bosses award equipment, and offline patrols keep the economy moving while the player is away.

## v1.0 campaign structure

The prototype now has five authored 10-wave regions. Each region has its own visual treatment, enemy names, boss, first-clear cache, and progression beat:

1. **Dustwater Gulch** — The Undertaker
2. **Boot Hill Midnight** — Madame Dead-Eye
3. **Bone Orchard** — Big Hank the Grave Troll
4. **Cinder Junction** — Sheriff Nevermore
5. **Hollow Mesa** — The Last Train

After Wave 50 the campaign can continue into an endless repeat of the five-region content set while the numerical pressure continues to rise.

Checkpoints remain every five waves. Every tenth wave is a boss and pauses for the equip/sell loot decision before the next region begins.

## Content now playable

- Five region palettes / identities.
- Twenty named normal-enemy variants across the four core mechanical archetypes.
- Four elite affixes: **Armored, Quickdraw, Frenzied, Gravebound**.
- Five bosses with distinct counterplay.
- Six ammunition families: Standard, Golden, Incendiary, Piercing, Dynamite, Storm.
- Five editable trick-peg families: Fire, Splitter, Piercing, Dynamite, Storm.
- Five persistent gear slots with Common → Unique rarity.
- Offline patrol earnings with an 8-hour cap.
- Repeatable bounty contracts.
- First-time onboarding and staged blueprint unlocks.

## Boss roster

### The Undertaker — Bone Ward
Starts behind a ward. Explosives strip the ward efficiently; below half HP he enrages and attacks faster/harder.

### Madame Dead-Eye — Grave Toll
Periodically summons Spectral Wraith Deputies. Crowd damage and special ammunition prevent the fight from snowballing.

### Big Hank the Grave Troll — Grave Regen
Regenerates while wounded and becomes more dangerous below 45% HP. Fire both deals bonus damage and suppresses his regeneration.

### Sheriff Nevermore — Raven Veil
Strongly resists plain shots, is vulnerable to Storm/Chain damage, and can rebuild a spectral ward during the fight.

### The Last Train — Black Iron
Heavily resists ordinary damage, is breached by explosives, and periodically fires an unavoidable cannon volley if the fight drags on.

## Progression pacing

Special systems are no longer presented all at once to a new save. The current authored unlock schedule is:

| Highest wave | New tool |
|---:|---|
| 3 | Incendiary ammunition + Fire Peg |
| 4 | Golden ammunition |
| 5 | Splitter Peg |
| 8 | Piercing ammunition / peg |
| 11 | Dynamite ammunition / peg |
| 16 | Storm ammunition / peg |

Existing test saves keep anything already purchased/unlocked; the gates only constrain new progression.

First clears of each 10-wave region award a one-time **Frontier Secured** cache of XP and Bounty Coins.

## Bounties

The Bounties tab is now an actual progression screen with three repeatable contracts:

- **Trailblazer** — clear waves.
- **Keep It Hot** — complete reload cycles.
- **Boss Hunter** — reach boss loot screens.

Contract tiers increase after claims, and rewards scale with campaign progress. Claims pay directly into the live XP/Coin economy without interrupting the run.

## Onboarding

A new save receives a short three-step introduction explaining:

1. the pachinko-board-as-gun relationship,
2. the XP / Coin / ammunition build layers,
3. why death and checkpoints are part of progression.

Blueprint unlocks also announce themselves as the player reaches the relevant waves.

## Balance baseline

v1.0 keeps difficulty **authored and deterministic**. Normal enemy HP currently grows at roughly 13.5% per wave before encounter/elite modifiers, while attack damage grows at roughly 7.5% per wave. This is slightly smoother than the earlier prototype curve while still ensuring that an un-upgraded build is eventually overtaken.

The DEV telemetry panel now includes an observed combat-output section based on recent wave duration, damage numbers, and reload cycles. This gives us actual DPS/clear-time measurements for future tuning.

### Adaptive difficulty director: intentionally NOT enabled

We explored a possible future system that estimates the player’s effective DPS/defense and lets enemy pressure slowly catch up after power spikes. **v1.0 does not use it.** Enemy HP does not secretly jump because the player bought an upgrade. We are collecting the measurements first so a future director can be tested against a clean authored baseline rather than assumed to be necessary.

## Idle layer

After at least two minutes away, the game calculates conservative patrol earnings from the last secured checkpoint and persistent build strength. Offline play can award XP and Bounty Coins but cannot:

- advance waves or checkpoints,
- defeat bosses,
- generate boss gear,
- make equip/sell choices,
- complete/claim active-play bounty objectives.

Offline rewards remain capped at 8 hours per return.

## Milestone status

1. Core pachinko → gunfight loop — **complete**.
2. First game-feel / art pass — **complete**.
3. Editable special-peg board — **complete**.
4. Configurable ammunition loadouts — **complete**.
5. Boss loot / gear buildcraft — **complete**.
6. Enemy identity / boss mechanics — **complete**.
7. Idle / offline progression — **complete**.
8. Multi-region campaign content — **complete**.
9. Bounties, onboarding, and unlock pacing — **complete**.
10. Authored balance baseline + combat telemetry — **complete**.

**v1.0 is the first systems-complete playtest candidate.** The next work should be driven by playtest evidence: tuning pacing/economy, replacing remaining prototype presentation with production art/audio, adding content variety where repetition appears, and deciding from telemetry whether adaptive pressure is actually beneficial.
