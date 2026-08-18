# Idle Pachinko Shootout — Development Roadmap

## Purpose

Idle Pachinko Shootout is now past the systems-prototype phase. v1.13 established a stable runtime foundation: one static engine, one authoritative gameplay save, consolidated Board/runtime ownership, and event-driven boundaries for future work.

The next phase should not be another architecture rewrite. It should protect the new foundation, make the first session substantially easier to understand, improve feel and presentation, tune progression, and then expand content only where playtesting shows repetition.

---

# Current State

The game already has:

- Core pachinko-to-shootout loop
- Hero and Board progression
- Specialty ammunition and specialty pegs
- Editable/upgradable placed pegs
- Finite specialty ammo quantities
- Bosses, field loot, gear, elites, and five regions
- Offline patrol progression
- Bounties
- Three-step introductory tutorial
- Settings / reset flow
- Basic telemetry
- Focus targeting and distinct enemy families
- v1.13 static engine/runtime consolidation

The major remaining problems are now product problems rather than foundation problems:

1. **New-player guidance is too passive.** The game explains systems but does not make the player use them.
2. **The first 30–60 minutes are not yet intentionally paced around discovery.**
3. **Game feel and presentation still lag behind the quality of the underlying systems.**
4. **Enemy/combat personality can become clearer and more dramatic.**
5. **Future content should be added only after the existing loop is easy to understand and satisfying to play.**

---

# Roadmap

## Milestone 1 — v1.13.1 Stabilization Seal
**Theme:** Protect the foundation, then stop doing architecture work.

### Goals

- Add lifecycle regression coverage around the consolidated v1.13 engine.
- Verify save migration and reset behavior.
- Remove remaining onboarding/campaign code that relies on broad DOM observation when explicit game events can be used instead.
- Perform a real-device iPhone/Safari sanity pass.

### Lifecycle coverage

Automate as much as practical of:

`new save → boot → clear wave → die → spend → Ride Again → boss → loot choice → next wave/region → save/reload → offline return`

Also cover:

`pre-v1.13 save → migrate → retain progression / gear / ammo / peg metadata`

### Acceptance Criteria

- No startup dependency errors.
- Wave clear cannot deadlock.
- Death → spend → Ride Again always returns to gameplay.
- Boss loot resolution always returns to gameplay.
- Save reset and save migration work.
- Offline return cannot soft-lock the run.
- Board upgrades and peg metadata remain covered by the existing v1.13 smoke test.
- No new runtime source-rewriting loaders are introduced.

**Exit rule:** when this milestone is green, architecture is no longer a roadmap theme. New systems must fit the v1.13 ownership boundaries rather than creating another cleanup cycle.

---

## Milestone 2 — Guided Onboarding & Progressive Tab Unlocks
**Theme:** Teach by doing, not by explaining.

The existing three introductory popups remain. They provide context, but they become the beginning of onboarding rather than the entirety of onboarding.

After the popups, the player should be guided through one meaningful action on each major progression surface as that surface becomes relevant.

### Core onboarding rule

For each progression surface:

1. Keep the tab visibly locked until the system is relevant.
2. Unlock the tab through a clear gameplay trigger.
3. Call attention to the newly unlocked tab without stopping gameplay unnecessarily.
4. Open or direct the player to the relevant screen.
5. Highlight one specific action.
6. If the action costs resources, grant the exact tutorial subsidy needed to ensure the player can afford it.
7. Require the player to complete the action.
8. Celebrate completion briefly and return control immediately.

Tutorial grants are one-time, idempotent, and delivered through the engine economy API. They must never be repeatable through refresh, death, migration, or reopening a tab.

### Tab states

Every bottom tab has three possible states:

- **Locked** — greyed out with a lock symbol.
- **New** — unlocked and visually called out until first opened.
- **Available** — normal gameplay state.

A locked tab should communicate its unlock condition instead of looking broken. Examples: `Unlocks after your first upgrade`, `Blueprint needed`, `Find your first gear`, or `Complete a bounty`.

### Proposed first-session sequence

#### 1. Hero — first active lesson

**Trigger:** completion of the three opening tutorial cards.

- Hero is the first progression tab made active.
- Other progression tabs are visibly locked.
- Grant enough tutorial XP to purchase one designated low-cost, immediately understandable Hero upgrade.
- Pulse the Hero tab.
- On open, visually mark the intended purchase.
- Completing the purchase finishes the lesson.

**Lesson:** XP makes the Gunslinger permanently stronger.

#### 2. Board — second active lesson

**Trigger:** first Hero lesson completed, followed by a natural combat beat such as the next reload/wave transition.

- Unlock Board.
- Grant enough tutorial Bounty Coins to purchase one designated Board improvement.
- Highlight that purchase.
- After purchase, briefly call attention to the physical Board so the player connects the menu action to what changes on screen.

**Lesson:** Bounty Coins change the machine that creates shots.

#### 3. Ammo — first blueprint lesson

**Trigger:** first ammunition blueprint becomes available through normal progression.

- Ammo remains greyed out before it has something meaningful to offer.
- On the first blueprint unlock, activate Ammo and mark it as NEW.
- Grant only the shortfall needed for the designated first ammunition purchase if necessary.
- Highlight the new ammo family and require the first unlock/purchase.
- The next few balls should make that ammunition visually obvious.

**Lesson:** ammunition changes what enters the pachinko board before pegs modify it.

#### 4. Gear — first loot lesson

**Trigger:** acquisition of the first piece of gear.

- Gear stays locked until gear exists.
- The first gear drop should be guaranteed early enough that this lesson cannot be missed for an unreasonable amount of time.
- Unlock Gear and guide the player through one meaningful gear action: equip the new item, compare/equip from the Gear surface, or otherwise make a deliberate equipment choice.
- Avoid requiring the player to memorize rarity/stat systems during the first lesson.

**Lesson:** loot changes the build between fights and persists across runs.

#### 5. Bounties — first claim lesson

**Trigger:** the first contract becomes claimable.

- Bounties remain locked until the player has actually made progress toward one.
- The first contract should complete early and predictably.
- Unlock Bounties when a reward is ready.
- Pulse the tab and highlight CLAIM.
- Require the claim action.

**Lesson:** ordinary play creates side objectives and additional progression resources.

### Onboarding behavior rules

- Never freeze the pachinko/combat simulation merely because a tab became available unless the current modal already pauses gameplay.
- Do not reopen lessons the player has completed.
- Returning players and migrated saves should infer completed lessons from existing progression where possible instead of forcing beginner onboarding.
- A player may skip the initial three explanatory cards, but skipping explanation should not silently remove all contextual guidance. Guided unlocks can remain concise and action-focused.
- Locked systems should not tease dozens of future mechanics at once.
- New unlocks should arrive one at a time whenever possible.

### Acceptance Criteria

A brand-new player can reach the first meaningful run/death cycle without external explanation and can answer, through actions rather than text alone:

- Where do I spend XP?
- Where do I spend Bounty Coins?
- What does the Board menu actually change?
- What is ammunition and why is it different from pegs?
- What do I do with loot?
- What are Bounties for?

No tutorial purchase can fail because the tutorial forgot to provide enough currency.

---

## Milestone 3 — First-Session Progression & Economy
**Theme:** Intentionally design the first 30–60 minutes.

Guided onboarding establishes the sequence; this milestone tunes the actual pacing around it.

### Tune

- First Hero purchase
- First Board purchase
- First blueprint
- First specialty-ammo purchase
- First checkpoint
- First death
- First completed bounty
- First gear drop
- First boss
- First meaningful gear replacement
- Second and third runs

### Design Goals

- The game should usually give the player one new concept at a time.
- Several small, satisfying purchases should precede the first expensive decision.
- Tutorial subsidies should teach systems, not meaningfully distort the long-term economy.
- The first death should feel like a progression beat, not failure or a forced reset.
- The second run should be visibly and mechanically stronger.
- The first blueprint should feel exciting rather than administrative.

### Acceptance Criteria

- First death generally lands in an intentional learning window.
- The player has already made at least two understandable permanent choices before death.
- Early unlocks do not pile up simultaneously.
- Different early upgrade paths begin producing meaningfully different runs.
- The first boss feels like the culmination of the tutorialized opening rather than the first time the game becomes legible.

---

## Milestone 4 — Core Game Feel Pass
**Theme:** Make every existing action feel better before adding more actions.

### Pachinko

- Stronger ball identity by ammo type
- Cleaner peg hit flashes
- Special-peg activation effects
- Better slot-hit emphasis
- More readable firing/launch cadence
- Better high-value hit feedback

### Combat

- Stronger muzzle flash and tracer presentation
- Enemy hit reactions and deaths
- Distinct feedback for crit, burn, splash, chain, pierce, and other special effects
- Better focus-target feedback
- Carefully limited screen shake/hit-stop for major moments

### UI

- Better sheet/modal transitions
- Currency movement/feedback
- Upgrade confirmation
- Blueprint unlock presentation
- Cleaner death/restart flow
- Better loot reveal

### Acceptance Criteria

Without reading debug information, the player can visually identify what kind of shot occurred, whether a special peg fired, which enemy is targeted, and when an important reward or upgrade happened.

---

## Milestone 5 — Art & Audio Identity
**Theme:** Make the game look and sound like spooky pulp Western pachinko, not a prototype.

### Art priorities

1. Gunslinger sprite/animation
2. Enemy family silhouettes and animation
3. Boss identity
4. Region backgrounds
5. Peg and ammo materials
6. Cylinder / slot presentation
7. Icons, buttons, rarity, and reward presentation

### Audio priorities

- Revolver fire and crit variant
- Ball launch and peg impacts
- Distinct specialty-peg/ammo sounds
- Enemy hit/death sounds
- Coin / XP / upgrade feedback
- Blueprint unlock
- Loot reveal / equip / sell
- Hero death
- Boss intro
- Region ambience/music

### Systems requirements

- Master volume
- SFX volume
- Music/ambience volume
- Mute
- Mobile autoplay compliance
- Voice/sound throttling during dense Board activity

### Acceptance Criteria

The game is recognizable from a screenshot and from a few seconds of audio. Regions, enemy families, specialty shots, bosses, and major rewards have distinct identities.

---

## Milestone 6 — Combat Readability & Enemy Personality
**Theme:** Make enemies feel like opponents rather than HP bars moving toward the player.

### Focus

- Better melee/ranged/hybrid distinctions
- Clear attack telegraphs
- Threatening-range feedback
- Enemy-family movement language
- Elite-affix readability
- Boss-specific tells and phases
- Tactical value for focus targeting

Examples:

- Ghosts hover/phase.
- Ghouls lunge.
- Trolls stomp and visibly absorb punishment.
- Zombies stagger relentlessly.
- Ranged enemies visibly prepare shots.

### Acceptance Criteria

Players can identify the immediate threat from animation and position, enemy families feel behaviorally different, and boss encounters read differently from ordinary waves before the player studies numbers.

---

## Milestone 7 — Content & Build Depth
**Theme:** Expand only where playtesting proves the existing game needs more variety.

Potential additions:

- New enemy subtypes and support enemies
- Regional hazards
- Wave mutators
- Boss variants
- New ammunition families
- New peg families such as Ricochet, Freeze, Curse, Money, Shield Break, or other build-defining mechanics
- More gear affixes and synergy pieces
- Stronger cross-system build identities

### Content rule

Do not add a new system merely because it is easy to imagine. Add it because it creates a new decision, solves repetition, or supports a build that the current content cannot express.

---

## Milestone 8 — v2.0 Public Playtest Candidate
**Theme:** A coherent first-hour experience suitable for broader testing.

### Deliverables

- Stable v1.13-derived architecture
- Automated lifecycle regression coverage
- Natural progressive onboarding
- Intentional first-hour economy
- Strong game feel
- Cohesive spooky Western art/audio identity
- Readable enemies and bosses
- Enough content variety for repeated sessions
- Useful balancing telemetry
- Clean settings/reset behavior

### Optional beta features

- Save export/import
- Patch notes / What's New
- Player-facing run statistics
- Better analytics summary for balancing

### Acceptance Criteria

A new player can start with no explanation, understand what to do, make meaningful build choices, experience death as progression, reach the first boss, and want to begin another run. Multiple 30-minute sessions remain rewarding, and continued development can focus on tuning/content rather than recovering from architectural regressions.

---

# Recommended Development Order

1. **v1.13.1 Stabilization Seal**
2. **Guided Onboarding & Progressive Tab Unlocks**
3. **First-Session Progression & Economy**
4. **Core Game Feel Pass**
5. **Art & Audio Identity**
6. **Combat Readability & Enemy Personality**
7. **Content & Build Depth**
8. **v2.0 Public Playtest Candidate**

---

# Immediate Work

The next implementation target should be **Milestone 1 followed immediately by Milestone 2**.

Do not add major new content before the first-session onboarding path exists. The game already has enough systems to test whether its core loop is compelling; the current need is to reveal those systems to a new player in a deliberate order.

# Success Definition

The next phase succeeds when the game's first hour feels authored rather than exposed: the player is shown one system when it becomes relevant, performs a useful action to learn it, understands the connection between the pachinko board and the shootout, receives increasingly expressive build choices without being flooded by menus, and can continue playing without tutorial text once the systems are learned.
