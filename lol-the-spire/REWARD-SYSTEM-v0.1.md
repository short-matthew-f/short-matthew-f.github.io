# Lane Warden — Reward Packet System v0.1

**Status:** Production specification for P2 implementation  
**Date:** 2026-08-23  
**Design source:** Clean Design Handoff baseline 1.7 + production playtest decisions through P1-0.12.0  
**Authority:** Resolves previously open reward-flow questions for production implementation. It does not silently rewrite unrelated baseline rules.

---

## 1. Purpose

Battle rewards should create the momentum that lets a run acquire a personality.

A reward is not a fixed pile of currency and it is not one universal deck. Every resolved victory creates a **reward packet** made of explicit components. Some components are guaranteed by encounter class, some are rolled from authored category pools, and some may appear only because relics or other run effects modify the packet.

The system should produce four linked pressures:

1. **Momentum** — winning changes what the player can do in later battles.
2. **Coverage** — reward categories help a build answer different battlefield demands.
3. **Routing** — known encounter/reward structure can make one branch more attractive than another without revealing exact loot.
4. **Risk choice** — hard normal battles remain normal-pay encounters, while Elites are dangerous specialized encounters with materially better packets.

A good reward packet should make the player think:

> *This could sharpen what I already do, or cover a weakness I know is coming.*

It should not make the player think:

> *I guess I take the least irrelevant thing because skipping means getting nothing.*

---

## 2. Encounter-pool rule

### 2.1 Normal battle pools

Within each act, count **normal Battle nodes resolved**, whether they ended in a normal victory or a payable Last Stand.

- Normal battles **1–3** are selected from the act's **Easy Pool**.
- Normal battle **4 onward** is selected from the act's **Hard Pool**.
- Elites, Gatekeepers, Caches, and other node families do not advance this count.

This count is resolution-based so a payable defeat cannot be used to remain in the Easy Pool indefinitely.

### 2.2 Easy does not mean uniform

Easy Pool encounters may vary significantly in difficulty. Their common property is **recoverability**, not identical threat.

Each Easy Pool encounter should primarily test one coverage question or a small combination, such as:

- concentrated siege pressure;
- Commander rotation;
- holding a weak lane while exploiting another;
- tower selection/position;
- pulse timing and Conscript/Rally use;
- gold spending;
- protecting a damaged Bastion;
- closing before Reclamation.

The pool should expose different holes in the player's toolkit without requiring complete coverage immediately.

### 2.3 Hard normals versus Elites

Hard Pool normal battles combine demands and may be as costly as an Elite in practical attrition.

**They still use the normal reward packet.**

This asymmetry is intentional. It creates a routing incentive:

> *If I am accepting a dangerous fight anyway, can my build solve the Elite's special rule and earn the premium packet?*

### 2.4 Elite identity

An Elite is not a normal battle with inflated health/damage.

Every Elite must have a **specialized authored mechanic** that changes the plan and is forecast before branch commitment. Examples include:

- a mobile siege objective;
- lane closures or lane-state inversion;
- a Guard whose regeneration is disabled through a side objective;
- an enemy that reacts to repeated Commander ability use;
- a field engine that changes pulse timing;
- a rule that makes abandonment behave differently;
- a bespoke reinforcement economy;
- a spatial mechanic that changes how Waypoint or Presence should be used.

The mechanic should be memorable enough that the player can name the Elite afterward.

---

## 3. Reward packet vocabulary

A reward packet contains one or more **components**.

### 3.1 Grant component

Automatically received when the packet is earned.

Example: base Salvage.

### 3.2 Choice component

Has exactly one reward category and generates an offer set from that category.

Default production shape:

- generate **3 offers**;
- player takes **1**;
- or skips the component for Salvage.

A modifier may change the offer count, reroll rights, quality distribution, or category.

### 3.3 Bonus component

An additional component that is not part of the base packet. It may arise from:

- the encounter template;
- a deterministic bonus roll;
- a relic;
- a Commander rule;
- an authored event/run effect.

A bonus component is additional to the base packet; it does not replace the guaranteed component unless the modifier explicitly says so.

### 3.4 Packet resolution

Each choice component is resolved independently.

An Elite packet containing a Relic component and a Growth component therefore allows the player to claim one reward from **each** component. Skipping the Relic component does not forfeit the Growth component.

---

## 4. Reward categories

### 4.1 SALVAGE

Run-level currency.

Uses:

- guaranteed economic progress on wins;
- skip conversion;
- performance salvage after payable defeat;
- Quartermaster purchases and reward control.

Salvage is a grant category, not normally an offer-card category.

### 4.2 UNIT

Acquire a new eligible lane-unit type/content option for the run.

Offers respect Commander catalogue restrictions and ownership rules.

### 4.3 TOWER

Acquire a new eligible tower type/content option for the run.

A Commander with no tower system is never offered this category.

### 4.4 COMMANDER

Acquire or improve an eligible Commander technique: ability option, ability enhancement, or authored Commander-specific run tool.

This category should primarily change decisions rather than add flat coefficient power.

### 4.5 RELIC

Acquire a persistent run relic.

Relics should primarily manipulate Lane Warden nouns and rules: Presence, movement, entering/leaving lanes, Waypoint, pulses, Bastions, Guards, towers, abandonment, reward structure, and other authored systems.

### 4.6 UPGRADE

Improve something already owned.

This is intentionally narrower and less controllable than a Forge node. A Forge remains valuable because it offers targeted, thesis-deepening improvement rather than a random battle-reward upgrade opportunity.

### 4.7 CAPACITY

Increase deployment capacity or an authored equivalent.

This is intentionally less common in battle packets than at an Armory. Armory remains the reliable pure-curve route choice.

### 4.8 LOGISTICS

Small run-level reward-control effects, for example:

- one future component reroll credit;
- one category-reroll credit;
- reveal one otherwise-random reward category on a forecast node;
- improve skip conversion on the next packet;
- preserve/lock one future offer under an authored rule.

Logistics is low-weight in normal packets. Quartermaster remains the reliable place to purchase targeted reward control.

### 4.9 EMBER

A premium special category, not part of ordinary normal-battle reward pools.

Ember gain/recovery must remain rare because it changes the run's failure budget. It may appear only in explicitly authored premium contexts such as a Gatekeeper, a rare event, Commander-specific content, or another named rule.

---

## 5. Category pools

The initial production weights below are **starting hypotheses** for P2, not balance invariants.

### 5.1 Normal Growth pool

Used by Easy and Hard normal battles.

| Category | Weight |
| --- | ---: |
| UNIT | 20 |
| TOWER | 20 |
| COMMANDER | 15 |
| RELIC | 15 |
| UPGRADE | 15 |
| CAPACITY | 10 |
| LOGISTICS | 5 |

Commander/catalogue restrictions remove illegal categories before normalization.

### 5.2 Elite Secondary pool

Relic is excluded because Elites already guarantee a Relic component.

| Category | Weight |
| --- | ---: |
| UNIT | 20 |
| TOWER | 20 |
| COMMANDER | 15 |
| UPGRADE | 20 |
| CAPACITY | 15 |
| LOGISTICS | 10 |

### 5.3 Normal Bonus pool

| Category | Weight |
| --- | ---: |
| UPGRADE | 30 |
| LOGISTICS | 30 |
| RELIC | 20 |
| CAPACITY | 20 |

The normal packet has a provisional **25%** chance to add a two-offer Bonus component from this pool.

This is a content/tuning value and may change after P2 reward-flow testing.

---

## 6. Packet templates

### 6.1 Easy Normal Battle

**Guaranteed:**

1. Salvage grant — `normal` band.
2. Growth choice — category rolled from Normal Growth pool; 3 offers; take 1 or skip for Salvage.

**Random:**

- 25% chance: Bonus choice — category rolled from Normal Bonus pool; 2 offers; take 1 or skip for Salvage.

### 6.2 Hard Normal Battle

Uses **exactly the same base packet value as Easy Normal**.

This is intentional and should not be silently scaled upward merely because the encounter is harder.

Hard normals create pressure to route toward Elites when the player is capable of solving the Elite's special mechanic.

### 6.3 Elite

**Guaranteed:**

1. Salvage grant — `elite` band, higher than normal.
2. Relic choice — RELIC; 3 offers; take 1 or skip for Salvage.
3. Secondary choice — category rolled from Elite Secondary pool; 3 offers; take 1 or skip for Salvage.

**Optional authored/random:**

- an Elite may add or weight a thematic secondary category when its mechanic strongly supports it;
- a bonus component may be added by relics or other run effects.

The premium value comes from the **combination packet**, not simply from higher Salvage.

### 6.4 Gatekeeper

**Guaranteed:**

1. Salvage grant — `gatekeeper` band.
2. Premium Relic choice — RELIC; 3 offers; higher quality distribution than an ordinary normal packet.
3. Act Growth choice — category rolled from UNIT / TOWER / COMMANDER / UPGRADE / CAPACITY / LOGISTICS; 3 offers; take 1 or skip.

**Special:**

- an authored Gatekeeper may add an EMBER or other act-specific component, but this must be explicit content rather than a universal automatic refill.

### 6.5 Cache

A Cache earns a reward without battle.

Initial P2 shape:

- one Growth choice from the Normal Growth pool;
- normal Bonus roll allowed;
- no battle-performance Salvage.

### 6.6 Payable Last Stand

A payable defeat does **not** create the battle's normal reward packet.

Instead:

- Last Stand resolves;
- Gate is destroyed;
- Ember cost is paid;
- performance Salvage is granted;
- run advances.

No reward relic may accidentally convert a payable defeat into a full normal victory packet unless an explicit rare effect is authored to do exactly that.

---

## 7. Encounter reward affinity

An encounter may carry an authored `rewardAffinity` toward one or more categories.

Example:

- an Easy Pool encounter designed around towers may weight TOWER and UPGRADE more heavily in its Growth category roll;
- a siege-oriented Elite may guarantee RELIC plus heavily weight UNIT/UPGRADE content that interacts with siege.

Affinity is **authored encounter identity**, not hidden adaptive loot.

Default starting rule:

- affinity multiplies a category's local weight by **1.5×** before normalization;
- affinity never makes an otherwise illegal category legal;
- an explicit category guarantee is stronger than affinity and must be forecast if route-visible.

---

## 8. Reward quality

Reward items may carry quality bands:

- Common
- Uncommon
- Rare

The packet template determines the quality distribution independently from category selection.

Initial production distributions:

| Context | Common | Uncommon | Rare |
| --- | ---: | ---: | ---: |
| Normal choice | 75 | 23 | 2 |
| Normal bonus | 60 | 35 | 5 |
| Elite Relic | 35 | 50 | 15 |
| Elite Secondary | 55 | 38 | 7 |
| Gatekeeper Relic | 10 | 55 | 35 |
| Gatekeeper Growth | 40 | 45 | 15 |

These numbers exist to make P2 implementable and testable. They are tuning hypotheses, not design invariants.

A quality shift modifies the distribution; it does not directly replace a Common offer with a Rare unless the effect says so.

---

## 9. Skip behavior

Skip is legal on every ordinary choice component.

Rules:

- guaranteed Salvage grants are kept regardless of later skips;
- each skipped choice component converts to Salvage independently;
- skip value depends on component/category/quality band and is tuning-owned;
- skip should be useful enough to prevent forced build dilution;
- skip should not normally be so lucrative that a player prefers Salvage to relevant rewards by default.

The run history records:

- packet generated;
- offers shown;
- rerolls used;
- rewards claimed;
- components skipped;
- Salvage obtained from skips.

---

## 10. Reward rerolls and control

There is **no universal free reroll button** by default.

Reward control comes from relics, Logistics, Quartermaster services, Commander rules, difficulty modifiers, or authored effects.

### 10.1 Standard reroll primitives

**Component reroll** — keep the category, regenerate the component's offers.

**Category reroll** — reroll the component's category and then regenerate offers.

**Packet reroll** — reroll all random components in the packet. Rare; reserved for strong effects.

Guaranteed categories cannot be removed by an ordinary category reroll. Example: an Elite's guaranteed RELIC component remains RELIC.

### 10.2 Reroll persistence

A reward packet is generated and persisted **once** when earned.

Reloading the app may not produce fresh offers.

Reroll use is also persisted immediately so app restarts cannot recover a spent reroll.

---

## 11. Reward-modifier relic grammar

Reward relics may modify packet generation through explicit hooks.

Supported starting hooks:

- `offerCountDelta(categoryOrComponent, +N)`
- `freeComponentRerolls(N)`
- `freeCategoryRerolls(N)`
- `bonusChanceDelta(+X)`
- `addBonusComponent(pool)`
- `qualityShift(categoryOrComponent, steps)`
- `skipSalvageMultiplier(X)`
- `revealRandomCategory(count)`
- `thesisFloorBoost(count)`
- `eliteExtraComponent(pool)`
- `packetReroll(count)`

Example relic concepts, not yet canonical content:

- first reward component reroll each battle is free;
- choice components show 4 offers instead of 3;
- normal packets have a higher chance to contain a Bonus component;
- Elite Secondary choices show one additional offer;
- skipping a component yields more Salvage;
- once per act, reroll one random reward category before viewing its exact offers;
- reveal one random reward category on the next two reachable nodes;
- after an Elite, add a small Logistics component;
- once per act, reroll an entire earned packet except guaranteed categories.

Reward relics should be visible in the reward-generation receipt so the player understands why the packet differed from baseline.

---

## 12. Pool control and thesis floor

Permanent unlocks must not punish the player by contaminating focused builds.

Generation order distinguishes **eligibility** from **compatibility**.

### 12.1 Catalogue eligibility

Commander catalogue/doctrine restrictions determine which categories/items are legal before random selection.

### 12.2 Thesis floor

Once the run has an established thesis, at least one offer in one eligible Growth component may be guaranteed compatible with that thesis.

Initial production rule:

- only one component per packet receives the default thesis floor;
- minimum guaranteed compatible offers: **1**;
- the remaining offers are still rolled normally;
- awkward choices remain possible;
- the UI labels the compatible guarantee as a rule effect rather than pretending it was uniform random luck.

Exact thesis-establishment criteria remain P2 tuning/content work, but the implementation must support the floor explicitly rather than requiring hidden adaptive replacement after generation.

---

## 13. Map forecasting

The baseline rule remains: **exact reward offers are hidden until earned.**

Reward categories may be forecast when they are structurally guaranteed.

Examples:

- Normal Battle: `SALVAGE + ?`
- Elite: `SALVAGE + RELIC + ?`
- Elite with authored secondary guarantee: `SALVAGE + RELIC + TOWER`
- Gatekeeper: `SALVAGE + RELIC + ACT GROWTH`

A random category is shown as `?` until earned unless an explicit reveal effect exposes it.

Reward-reveal relics/logistics may expose categories early, but never exact items unless a stronger authored effect explicitly says so.

This preserves the map's intended distinction:

- threats are forecast enough to route deliberately;
- loot remains uncertain enough to create a roguelite build arc.

---

## 14. Generation order

Reward generation must be deterministic for a fixed run seed, node identity, run state, and modifier state.

Apply in this order:

1. select encounter reward template;
2. apply Commander catalogue / doctrine eligibility;
3. apply authored encounter category guarantees and affinities;
4. apply packet-structure relic/modifier hooks;
5. roll random component presence;
6. roll random categories;
7. roll quality bands;
8. generate offer items from legal category pools;
9. apply the declared thesis floor;
10. deduplicate where pool depth permits;
11. persist the packet;
12. present to player;
13. process player rerolls, claims, and skips as explicit persisted mutations.

Do not regenerate earlier stages because the player opened/closed the reward screen.

---

## 15. Exhaustion and duplicate rules

- Unique rewards already owned are removed from acquisition pools unless they define an explicit stack/upgrade form.
- A single component should not show duplicate offers when enough legal pool depth exists.
- If a category cannot produce the required number of legal offers, generate all legal distinct offers and mark the component thin rather than inventing illegal content.
- If a category has no legal offer, fall back in this order:
  1. authored fallback category if specified;
  2. UPGRADE if legal;
  3. LOGISTICS if legal;
  4. Salvage conversion.

A thin pool is a content/catalogue problem worth recording; it should not silently produce nonsense.

---

## 16. Difficulty modifiers

Command Levels and other difficulty systems may modify reward packet structure explicitly.

Examples:

- Thin Offers: reduce offer count from 3 to 2;
- Lean Salvage: reduce grant/skip Salvage bands;
- scarce reroll economy;
- reduced bonus-component chance.

Difficulty changes should use named rules. Do not secretly lower reward quality because the battle was hard.

In particular:

**Easy Normal and Hard Normal use the same base normal packet.**

---

## 17. P2 data contract

Each earned packet should serialize at minimum:

```text
packetId
schemaVersion
runSeed
actId
nodeId
encounterClass
encounterId
sourceTemplateId
generatedAtRunStep
modifierReceipt[]
components[]
  componentId
  kind: grant | choice | bonus
  guaranteed: boolean
  category
  qualityPolicy
  offers[]
  rerollsUsed
  state: unresolved | claimed | skipped
  claimedOfferId?
  skipSalvage?
packetState: unresolved | resolved
```

The receipt is not necessarily all player-facing, but it is required for debugging, run-end diagnosis, deterministic tests, and future balance analysis.

---

## 18. P2 acceptance checks

P2 reward implementation is not considered healthy until all of these hold:

1. Normal battles 1–3 in an act select encounters only from the Easy Pool.
2. Normal battle 4+ selects from the Hard Pool.
3. Easy and Hard normals use the same base reward packet value.
4. Every Elite has a forecast specialized mechanic and a guaranteed premium combination packet.
5. Elite packet includes a guaranteed Relic component plus a second meaningful component.
6. Gatekeeper packet includes a premium Relic component plus Act Growth.
7. Payable Last Stand grants performance Salvage but no normal reward packet.
8. Exact item offers cannot be inspected before the reward is earned.
9. Guaranteed reward categories can be forecast without revealing exact items.
10. Skip is legal per component and grants Salvage.
11. Reloading an unresolved reward screen reproduces the exact persisted packet.
12. Rerolls are persisted immediately and cannot be recovered by reload.
13. Reward modifiers apply in deterministic order and leave a receipt.
14. Commander catalogue restrictions prevent impossible categories.
15. Thesis-floor intervention is explicit, bounded, and not disguised as uniform randomness.
16. Unique/illegal offers do not leak through when pools are exhausted.
17. Reward relics can modify offer count, rerolls, bonus categories, quality, skip value, or forecast without bespoke reward-screen code for each relic.

---

## 19. First P2 implementation slice

Build only enough content to validate the architecture:

- **3 Easy Pool encounters** with different coverage questions;
- **1 Hard Pool encounter** combining at least two of those questions;
- **1 Elite** with a genuinely specialized mechanic;
- **1 Gatekeeper**;
- small legal pools for UNIT, TOWER, COMMANDER, RELIC, UPGRADE, CAPACITY, and LOGISTICS;
- enough reward-modifier relics to prove reroll, offer-count, bonus-category, and skip-value hooks;
- one Quartermaster interaction that sells reward control;
- deterministic reward persistence and run-history receipts.

Do not build a huge relic catalogue before this seam is proven.

---

## 20. Open tuning questions

These remain intentionally empirical:

- exact Salvage amounts and Quartermaster prices;
- exact bonus-component chance;
- quality distributions;
- thesis-establishment threshold;
- how frequently battle packets should roll CAPACITY versus keeping Armory uniquely attractive;
- how frequently UPGRADE should appear without weakening Forge identity;
- exact Elite/Gatekeeper premium strength;
- whether Act 2+ changes the first-three-normal Easy Pool count;
- whether some Commanders replace entire reward categories structurally.

The packet structure and modifier grammar should remain stable while these values are tuned.
