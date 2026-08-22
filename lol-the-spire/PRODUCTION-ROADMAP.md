# Lane Warden — Production Integration Roadmap

**Status:** QUEUED after preproduction-suite closeout  
**Date:** 2026-08-22  
**Design source:** Clean Design Handoff baseline 1.7 + empirical preproduction closeout  
**Authority:** Implementation sequencing plan only. It does not override the normative design handoff.

## 1. Phase change

Preproduction mockups are finished. The next work is **production integration and vertical-slice buildout**, not another chain of isolated test harnesses.

Further standalone prototypes should be created only when a specific unresolved design risk cannot be answered responsibly inside the production build.

The first production target must exercise the actual game loop:

**Choose Commander → Read act map → Choose node → Deploy → Battle / node resolution → Reward or Last Stand → Return to map → Repeat → Gatekeeper / run end**

Historical R01/R02 and Test 0–10 builds remain preserved evidence and implementation references. Production code should not depend on wrapper chains between those historical folders.

---

## 2. Frozen inputs from preproduction

Carry these forward unless new production evidence directly contradicts them.

### Battlefield / information

- Global state must remain readable without camera hunting.
- Commander and Rival identity must be unmistakable independently of Presence.
- Ordinary lane-unit health is contextual rather than permanently instrumented.
- Bastion is presented primarily as an urgency/clock state.
- Gate vulnerability is explicit and causal.
- Guard uses the Test 7 hybrid information contract: **semantic state + compact evidence of direction**.
- Threat ownership must identify the affected lane.

### Phone interaction

- One-finger battlefield pan does not issue movement orders.
- Pinch zoom is bounded.
- Lane-strip navigation moves the camera only.
- Commander recenter remains persistent.
- Core interaction targets remain at least 44 CSS px.
- Use transient targeting/detail surfaces rather than filling the battlefield with permanent controls.
- The Test 8 candidate footprint is an accepted reference: ~25% persistent HUD and ~34% with tested transient panels at 852×393 landscape.

### Runtime / performance

- Keep visible rendering cost separable from offscreen simulation cost.
- Offscreen actors may continue to simulate without paying full render cost.
- Preserve fixed-seed reproducibility for simulation-affecting randomness.
- Test 9 proxy counts are stress evidence, **not shipping wave-size targets**.

### Defeat

- Payable defeat: Core falls → Commander Last Stand → Gate destroyed → Ember cost → no normal reward → salvage context → advance.
- Terminal defeat still receives the full Commander Last Stand before run-end closure.
- The Warden's Last Stand is **Bulwark Detonation**.
- Production polish: fully clear the prior cinematic title before the final terminal epitaph enters; do not repeat the Test 10 text-over-text collision.

---

## 3. Immediate unresolved risk: protected reading / time dilation

The design still deliberately leaves the exact protected-reading/time-dilation mechanism open.

Required outcome:

- players can read and compare battle menus on a phone without a dexterity tax;
- slower readers are not charged more strategic opportunity merely for reading slowly;
- fast readers do not receive a hidden resource advantage;
- opening menus cannot create unlimited tactical bullet-time;
- the player understands what slowdown exists and what consumes it;
- the tactical clock remains meaningful.

### Production rule

Implement one candidate model early in the production shell and validate it with human use before proliferating many battle menus.

This is the one presently known design risk important enough to justify a focused side experiment if production integration alone cannot answer it.

---

## 4. P0 — Production foundation

### Goal

Create a stable product codebase that owns the validated behavior directly rather than importing historical test runtimes.

### Build

- new production app/PWA root;
- stable application shell and routing;
- simulation/runtime layer separated from presentation;
- deterministic simulation seed and run seed recording;
- data-driven content definitions for Commanders, lane units, towers, encounters, map nodes, rewards, relics, mutators, and Gatekeepers;
- run-state model;
- save/resume after every resolved node;
- production HUD shell using the validated phone information hierarchy;
- development/evidence tools kept separable from player UI;
- explicit mobile lifecycle handling;
- automated regression checks for core invariants.

### Minimum regression invariants

At least:

- deployment legality;
- one-lane Gate vulnerability;
- Guard regeneration behavior;
- Bastion mediation of Core access;
- zero-Ember legality;
- payable versus unpayable Last Stand resolution;
- terminal Last Stand playback before run end;
- reward skip path;
- run-node persistence/resume;
- deterministic seed reproducibility where promised;
- Commander structural constraints;
- no ordinary mid-battle recomposition.

### Exit

A placeholder-content product build can execute this seam without test-harness wrappers:

**new run → map → battle node → deployment → battle → win/defeat resolution → map**

It does not yet need broad content or final art.

---

## 5. P1 — First production battle slice

### Goal

Build one real Lane Warden battle using **Act 1 rules**, not the R02-D stress fixture.

### Act 1 structural rules

- **two lanes**;
- no Rival Commander;
- teach deployment, Presence, Bastion clocks, Guard thresholds, Gate vulnerability, Waypoint, and Last Stand;
- Gate scripts/basic mutators may exist, but encounter complexity stays low.

### Player content

**Commander:**
- The Warden

**Starting lane units:**
- Ironjack
- Slingline
- Bulwark
- Zealot
- Siege Ram

**Starting towers:**
- Bolt Tower
- Frost Coil
- Scattergun
- War Pylon

**Baseline Commander abilities:**
- Rally
- Sunder
- Waypoint
- Conscript

### Battle systems required

- deployment lock;
- authored two-lane geometry and junction movement;
- staggered pulses and evolving fronts;
- Presence value;
- Commander travel/incapacitation/reform;
- Bastions and shared Core;
- regenerating Guards and one-lane Gate breach;
- battle gold and competing lane sinks;
- selected-structure controls;
- Reclamation phase;
- normal victory;
- payable Last Stand;
- terminal Last Stand;
- Test 7 information policy and Test 8 HUD behavior.

### Exit

One production-quality rules slice can be played from deployment through resolution on the target phone with no diagnostic overlay required to understand the game.

Visual assets may still be first-pass production assets rather than final polish.

---

## 6. P2 — Run-loop vertical slice

### Goal

Connect battles to the roguelite layer so the game begins to develop context across nodes.

### Recommended short vertical-slice route

Use a deliberately short authored route before scaling to a full act. It should contain enough node types to exercise distinct run-state seams, for example:

1. Battle
2. reward choice / skip for salvage
3. one build-shaping non-battle node such as Forge or Armory
4. another Battle or Elite
5. one Ember-facing decision such as Rift
6. short Gatekeeper resolution

This short route is an implementation-sequencing recommendation, not a replacement for the design target of roughly 8–10 traversed nodes per act.

### Systems required

- map graph and branch/rejoin navigation;
- known-threat forecasting before branch commitment;
- hidden exact reward offers until earned;
- Embers as continuously visible run currency;
- salvage;
- normal reward choice;
- legal reward skip;
- at least one upgrade/capacity node;
- at least one voluntary Ember decision;
- Gatekeeper transition;
- run-end diagnosis;
- save/resume after every resolved node.

### Exit

A player can start a run, make at least one route/build decision that changes the next battle, and finish or lose the short run without developer intervention.

---

## 7. P3 — Full Act 1

### Goal

Scale the vertical slice into the first actual production act.

### Target shape

- two lanes throughout ordinary Act 1 encounters;
- roughly 8–10 traversed nodes;
- multiple branches/rejoins;
- visible Gatekeeper pressure;
- enough Battles/Elites and non-battle nodes for a run thesis to begin forming;
- no Rival Commander yet.

### Node families available

- Battle
- Elite
- Forge
- Armory
- Quartermaster
- Regroup
- Cache
- Rift
- Gatekeeper

Not every generated Act 1 map must contain every family.

### Content/tuning work

- expand the encounter set beyond preproduction fixtures;
- tune coupled battle parameters with fixed-seed parameter sweeps;
- exercise several legal strategic shapes;
- validate that thin-everywhere play does not dominate;
- human-test whether players can explain deliberate sacrifices;
- validate reward-pool behavior as the owned catalogue grows.

### Exit

Act 1 feels like a coherent short roguelite act rather than a sequence of disconnected battle demonstrations.

---

## 8. Parallel visual-production track

Do not wait for all gameplay code before starting the production asset pipeline.

The baseline-1.7 visual strategy is:

> **AI creates and explores; a deterministic asset pipeline normalizes; the game validates at phone scale.**

### First comparison set

Start small and representative:

- The Warden;
- Ironjack;
- Slingline;
- Siege Ram;
- Bolt Tower;
- Frost Coil;
- one Bastion;
- one Guard/Gate family piece.

### Required workflow

1. concept candidates;
2. select canonical design;
3. multiview sheet including game-camera/top-down view;
4. mesh/source generation;
5. deterministic normalization of scale, origin, forward direction, topology/normals/material slots;
6. rig only where needed;
7. minimal animation set;
8. flat material regions first;
9. actual phone-camera validation;
10. richer textures only after silhouette/scale/animation read correctly.

Every production asset records provenance and rights basis before promotion into the production set.

### Art-track exit for P1

Enough coherent first-pass production assets exist that the first battle slice no longer looks like unrelated prototype primitives, while still prioritizing overhead recognition over texture detail.

---

## 9. What not to build yet

Until the P1/P2 seams are healthy, avoid spending major production time on:

- all five Commanders;
- Act 2 Rival content at production depth;
- Act 3 mutator breadth;
- large permanent relic catalogues;
- final high-detail texture passes;
- broad meta-progression;
- Daily Gate productionization;
- large-scale content quantity whose underlying reward/run seams have not yet been proven in the real product.

These belong after the first production loop is stable.

---

## 10. Queue order

1. **P0 production foundation**
2. **Protected-reading/time-dilation candidate inside P0**
3. **P1 two-lane Act 1 battle slice**
4. **P2 short run-loop vertical slice**
5. **P3 full Act 1**
6. **Act 2: three lanes + Rival Commander**
7. **Act 3: heavier mutators + final Gatekeeper complexity**

The visual-production track runs in parallel beginning during P0/P1.

## 11. Immediate next build

Create the **P0 production foundation** first. Do not start by adding more content to an old test folder.

The first visible milestone should be modest but real:

> **A clean production PWA can start a Warden run, show an Act 1 map, enter a two-lane deployment, play one production-owned battle, resolve the node, persist the result, and return to the map.**

That is the bridge from a validated game idea to a game product.
