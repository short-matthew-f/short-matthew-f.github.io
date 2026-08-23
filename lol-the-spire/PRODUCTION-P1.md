# Lane Warden — P1 First Production Battle

**Build:** `P1-0.11.0`  
**Stable install scope:** `/lol-the-spire/lane-warden-prod-v0.10.4/`  
**Status:** ACTIVE HUMAN-TUNING BUILD  
**Design baseline:** 1.7

## Purpose

P1 is the first production battle slice using actual Act 1 rules rather than a historical stress/test fixture.

The target is one complete, phone-playable battle in which deployment, Commander location, lane pressure, Guard replacement, Gate vulnerability, battle gold, structures, Reclamation, and Last Stand all belong to the same production-owned runtime.

## Implemented production rules

- two Act 1 lanes;
- no Rival Commander;
- 6 Unit-point / 4 Tower-point deployment capacity;
- legal deployment enforcement;
- all five starting lane units with authored relative costs;
- all four starting towers with authored relative costs and role identities;
- recurring pressure pulses;
- larger-than-viewport battlefield with camera pan and bounded zoom;
- lane-strip navigation that moves the camera without moving the Commander;
- timed Commander walking through an authored junction;
- instant Waypoint relocation through explicit targeting;
- visible Presence and Presence-linked local value;
- Commander health, endangered state, incapacitation, and reform;
- friendly pressure attacking enemy Guards and the Gate;
- enemy pressure attacking player Bastions and then the shared Core;
- regenerating living Guards;
- permanent one-lane Gate-vulnerability latch after a Guard line breaks;
- exposed Gate that still must be destroyed for normal victory;
- selected-lane structure controls;
- battle-gold tower Fortify and Overcharge;
- two-pulse reinforcement without mid-battle recomposition;
- Reclamation countdown, announcement, artillery, Guard rebuild, and abandonment pressure;
- Reclamation Guard rebuild without restoring Gate shielding;
- normal victory;
- payable and terminal Bulwark Detonation;
- in-progress battle recovery snapshots;
- finite protected-reading candidate;
- self-updating PWA delivery.

## Important correction from P0

P0 used a deliberately simplified aggregate-pressure model and partially inverted the structural responsibilities of Bastions and Guards.

P1 restores the intended rule grammar:

- **Bastions are player defenses protecting Core access.**
- **Guards are enemy defenses protecting Gate access.**
- A losing lane is driven toward the player's Bastion and Core.
- A winning lane is driven toward the enemy Guard and Gate.

This is now a regression-protected rule rather than presentation convention.

## Current tuning hypotheses

These values are not design invariants:

- Commander normal lane walk: 7 seconds;
- Warden reform: 12 seconds;
- Reclamation trigger: 180 seconds;
- artillery cadence: 14 seconds;
- artillery telegraph: 4 seconds;
- Guard rebuild cadence: 28 seconds;
- protected-reading slowdown: 35%;
- protected-reading reserve: 4 seconds.

## Human-use focus

P1 is no longer a formal test harness. Normal production play should now answer questions through use:

1. Can a player state a deployment thesis before locking the 6/4 budget?
2. Does walking versus Waypoint create a real rotation choice?
3. Does gold force a meaningful choice between stabilizing one lane and accelerating another?
4. Can the player tell whether Guard pressure is below or above replacement?
5. Does breaking a Guard create a satisfying Gate phase rather than an automatic win?
6. If Reclamation begins, can the player attribute each new pressure to it?
7. Does protected reading feel like permission to think rather than another resource meter to manage?

## P1 exit

P1 is ready to close when the first battle can be played repeatedly on the target phone without developer explanation, the major tactical states are understandable from production UI, and the player is making deliberate lane/rotation/economy decisions rather than merely waiting for aggregate pressure to resolve.

The next roadmap phase is **P2 — short run-loop vertical slice**: reward/skip, a build-shaping node, another encounter, an Ember-facing decision, and a short Gatekeeper sequence.
