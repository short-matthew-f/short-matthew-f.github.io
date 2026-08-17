# Idle Pachinko Shootout — Next Milestones Roadmap

## Purpose
This document lays out the next development milestones for **Idle Pachinko Shootout** following the systems-complete prototype phase. The goal is to move from “feature-complete prototype” to a **stable, fun, polished, and testable game slice** with stronger feel, clearer progression, and substantially improved presentation.

---

## Current State Summary
The game currently has:

- Core pachinko-to-shootout loop
- Hero upgrades and board upgrades
- Specialty ammo and specialty pegs
- Finite specialty ammo quantities
- Bosses, loot, gear, and regions
- Offline progress
- Bounties / onboarding / settings / reset flow
- Basic telemetry
- A working combat concept with enemy movement, roles, and focus targeting

However, the project is still limited by four major issues:

1. **Engine fragility** from layered runtime patching
2. **Prototype-level presentation** (art, FX, transitions, feedback)
3. **Limited game feel** (impact, responsiveness, animation quality, sound)
4. **Untuned progression pacing** after the first few deaths and unlocks

The next milestones address those in that order.

---

# Milestone Overview

## Milestone 1 — Engine Consolidation & Stability (v1.3)
**Theme:** Make the game reliable before making it prettier.

### Goals
- Flatten the current loader/patch architecture into a single canonical game engine file
- Remove dependency leaks between version patches
- Make startup, wave transitions, death/restart, loot, and offline return reliable
- Improve debuggability and reduce regression risk

### Why this matters
The current prototype has proven the design, but it is too brittle. Recent bugs came from layered patches depending on old helper functions. Adding more content and feel on top of that would be expensive and unstable.

### Deliverables
- One primary game engine file
- One save migration layer
- One clean boot path
- Standardized helpers for combat, wave progression, loot resolution, board logic, ammo logic, and UI state
- Centralized error reporting
- DEV diagnostics preserved and improved

### Acceptance Criteria
- Cold load works consistently on iPhone/Safari
- No startup dependency errors
- Wave clear cannot deadlock
- Death → upgrade → ride again flow always returns to gameplay
- Boss loot resolution always returns to game
- Save reset and save migration both work
- Offline return can never soft-lock the run

### Nice-to-have
Add a simple internal smoke-test mode for load, wave clear, death, loot, and restart.

---

## Milestone 2 — Game Feel Pass I: Core Juice (v1.4)
**Theme:** Make the game feel satisfying before expanding it.

### Goals
Improve the tactile and visual feel of the existing loop without changing the core rules.

### Focus Areas
#### Pachinko board feel
- Stronger ball glow / material identity per ammo type
- Clearer peg hit flashes
- Particle pops on special peg activation
- Better slot-hit emphasis
- More readable launch cadence

#### Combat feel
- Clearer muzzle flashes
- Better shot tracers
- Stronger enemy hit reactions and deaths
- Distinct feedback for crits, DoT, splash, chain, pierce, and burn
- More readable focused-target highlight

#### UI feel
- Better sheet/modal transitions
- Clear reward popups
- Smoother currency feedback
- Cleaner death / loot / blueprint announcements

### Acceptance Criteria
A player can visually identify special peg triggers, specialty bullets, crits, status effects, and the focused target without reading debug information.

---

## Milestone 3 — Art Direction Pass I (v1.5)
**Theme:** Replace prototype presentation with a stronger game identity.

### Visual Direction Goal
**Spooky pulp Western** with strong readability on mobile.

### Art Priorities
- Polished stylized Gunslinger
- Distinct Zombie Cowboy, Ghoul Outlaw, Ghost Bandit, and Grave Troll silhouettes
- Distinct boss silhouettes and poses
- Stronger visual identities for Dustwater Gulch, Boot Hill Midnight, Bone Orchard, Cinder Junction, and Hollow Mesa
- Better materials for normal and special pegs
- Sharper cylinder and slot presentation
- Improved iconography, buttons, rarity treatment, and typography hierarchy

### Acceptance Criteria
- The game no longer reads as a functional CSS prototype
- Regions are visually distinct at a glance
- Enemies are identifiable by silhouette
- Bosses feel visually special and threatening

---

## Milestone 4 — Audio & SFX Pass I (v1.6)
**Theme:** Give the game a sonic identity.

### Board / Ball Sounds
- Ball launch tick
- Peg hits
- Fire crackle
- Splitter pop
- Piercing ping
- Dynamite thump
- Storm zap
- Slot landings with stronger high-value feedback

### Combat Sounds
- Revolver shot and crit variant
- Hit impacts and enemy deaths
- Burn, chain, explosion, and piercing sounds
- Enemy ranged and melee attacks

### Progression / UI Sounds
- Coin / XP feedback
- Upgrade confirm
- Blueprint available / purchased stings
- Loot reveal
- Equip / sell
- Death and boss intro stings

### Music
Start with a small set: ambient combat tracks, a boss tension track, and a calmer menu layer.

### Systems Requirements
- Master volume
- SFX volume
- Music / ambience volume
- Mute toggle
- Mobile autoplay compliance
- Sound throttling to prevent spam

---

## Milestone 5 — Progression & Economy Tuning (v1.7)
**Theme:** Make the first 30–60 minutes intentionally designed.

Tune the first death, checkpoint, blueprint, boss, gear replacement, specialty build identity, and second/third runs. Balance hero costs, board costs, ammo quantity and tuning costs, blueprint gates, gear values, and rewards.

### Acceptance Criteria
- First death remains roughly in the 4–8 minute learning window
- Several small purchases precede the first truly expensive decision
- First blueprint is significant rather than automatic
- A second run is noticeably stronger
- Different upgrade strategies produce meaningfully different outcomes

---

## Milestone 6 — Combat Readability & Enemy Personality (v1.8)
**Theme:** Make enemies feel like enemies, not moving targets.

Improve lane motion, melee/ranged/hybrid behavior, attack telegraphs, threatening-range feedback, elite affixes, and boss tells. Add family-specific motion such as Ghost hovering, Ghoul lunges, Troll stomps, and Zombie stagger walks.

### Acceptance Criteria
Players can identify the immediate threat, focus targeting matters tactically, enemy families feel behaviorally distinct, and boss fights read differently from normal waves.

---

## Milestone 7 — Content Expansion Pass I (v1.9)
**Theme:** Add variety only after the feel is good.

Potential additions include new enemy subtypes, support enemies, wave mutators, Ricochet/Freeze/Curse/Money/Shield-break pegs, new ammunition, more build-defining gear, and regional hazards or boss variants.

---

## Milestone 8 — Session Polish / Beta Candidate (v2.0)
**Theme:** Turn the vertical slice into a true public playtest candidate.

### Deliverables
- Stable engine
- Strong first-session flow
- Polished visuals
- Baseline audio package
- Tuned first 30–60 minutes
- Cleaner settings/options
- Better telemetry
- Clearer player messaging

### Optional Beta Features
- Save export/import
- Patch notes
- Analytics summary for balancing
- “What’s new” popup

### Acceptance Criteria
A new player can understand and enjoy the game without prior explanation, it looks and sounds intentionally made, multiple 30-minute sessions remain rewarding, and core loops are stable enough for broader feedback.

---

# Graphical Update Plan

## Priority 1 — Immediate impact
1. Better hero sprite
2. Better enemy sprites / silhouettes
3. Better region backgrounds
4. Special peg styling
5. Stronger board/combat FX
6. Focus target highlight
7. Better loot cards

## Priority 2 — Secondary polish
1. Ambient regional particles
2. Subtle screen shake on heavy hits
3. Improved damage numbers
4. Boss intro cards
5. Animated UI buttons
6. Currency / reward pop effects

## Priority 3 — Longer-term polish
1. Region-specific board skins
2. Elaborate boss art
3. Variant enemy costumes
4. Environmental animation layers
5. Higher-quality icon system

---

# Sound Effects Plan

## Must-have
Fire shot, crit shot, peg hit, Fire/Splitter/Storm/Dynamite/Piercing effects, coin and XP rewards, upgrade buy, boss intro, enemy death, and hero death.

## Nice-to-have
Focus select, blueprint events, equip/sell, region stings, bounty claim, and menu swishes.

## Audio Design Notes
Sounds should be short, readable, stylized rather than realistic, subtly varied to reduce repetition, and reserve the biggest sonic moments for meaningful events.

---

# Recommended Development Order
1. **Engine Consolidation & Stability**
2. **Game Feel Pass I**
3. **Art Direction Pass I**
4. **Audio & SFX Pass I**
5. **Progression & Economy Tuning**
6. **Combat Readability & Enemy Personality**
7. **Content Expansion Pass I**
8. **Beta Candidate**

This order avoids polishing unstable systems while getting to “feels good” early enough to guide tuning.

# Immediate Priorities
1. **Stabilize the engine**
2. **Improve feel (FX + responsiveness + clarity)**
3. **Add sound effects and audio controls**

# Suggested Success Definition
The next phase succeeds when the game boots reliably, the first 10 minutes are clearly fun, the first 30 minutes feel paced and rewarding, the board and combat feel satisfying, the player can see and hear what matters, the game looks intentional rather than provisional, and further work can focus on content rather than firefighting.
