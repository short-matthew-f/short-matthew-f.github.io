# Lane Warden — P2 Reward Implementation Handoff

**Status:** READY FOR IMPLEMENTATION  
**Date:** 2026-08-23  
**Primary spec:** `REWARD-SYSTEM-v0.1.md`  
**Machine config:** `reward-system-v0.1.json`

## Build objective

Replace the P1 placeholder victory payout with a persistent, deterministic reward-packet flow that can carry the P2 short run loop.

The first implementation should prove the seam, not populate a huge catalogue.

## Required P2 slice

### Encounter selection

- count normal Battle nodes resolved per act;
- normal #1–3 select from Easy Pool;
- normal #4+ select from Hard Pool;
- payable Last Stand advances the normal count because the node resolved;
- Elite/Gatekeeper/non-battle nodes do not advance it;
- Easy and Hard normals use the same reward packet template.

### Reward engine

Implement:

1. deterministic packet generation from run seed + node + reward state;
2. packet persistence immediately on creation;
3. guaranteed components;
4. random category components;
5. offer generation by category and quality policy;
6. per-component claim/skip;
7. skip-to-Salvage conversion;
8. component/category/packet reroll primitives;
9. immediate persistence of rerolls;
10. modifier receipt;
11. Commander catalogue filtering;
12. bounded thesis-floor hook;
13. duplicate/exhaustion fallback;
14. reward forecast category surface;
15. run-history receipts.

### Initial packet templates

**Normal**
- guaranteed normal Salvage grant;
- one random Growth category, 3 offers, take 1 or skip;
- 25% provisional Bonus component, 2 offers.

**Elite**
- guaranteed elite Salvage grant;
- guaranteed RELIC choice, 3 offers;
- guaranteed random Secondary choice, 3 offers.

**Gatekeeper**
- guaranteed gatekeeper Salvage grant;
- guaranteed premium RELIC choice, 3 offers;
- guaranteed Act Growth choice, 3 offers;
- authored special component allowed but not required.

**Payable Last Stand**
- no normal packet;
- performance Salvage only.

## Minimal content for the first reward test

Enough content to avoid fake variety:

- 4+ UNIT offers;
- 4+ TOWER offers;
- 4+ COMMANDER offers/enhancements;
- 8+ RELIC offers;
- 4+ UPGRADE offers;
- 3+ CAPACITY offers;
- 4+ LOGISTICS offers.

These are minimum test-pool depths, not launch catalogue targets.

## Reward-modifier relic proof set

Implement four test relic mechanics before broad relic content:

1. **Offer width** — +1 offer in each standard Growth component.
2. **Reroll** — first component reroll each earned packet is free.
3. **Bonus packet** — increased normal Bonus-component chance.
4. **Skip economy** — increased Salvage from skipped components.

Names/art are not required for the systems proof.

A fifth optional proof relic may reveal one random reward category on upcoming reachable nodes.

## UX contract

Reward screen should show components as separate claimable sections.

Each section communicates:

- category;
- quality/rarity of offers;
- tags and affected systems;
- explicit thesis-compatible guarantee if one applied;
- rerolls remaining and what kind they are;
- exact Salvage value for Skip before confirmation.

The player may claim/skip components in any order.

Leaving/reloading the reward screen returns to the same unresolved packet state.

### Forecast

Before reward is earned:

- exact items remain hidden;
- guaranteed categories may be shown;
- random categories appear as `?` unless a reveal effect exposes them.

Reference node summaries:

- Normal: `SALVAGE + ?`
- Elite: `SALVAGE + RELIC + ?`
- Gatekeeper: `SALVAGE + RELIC + ACT GROWTH`

## Save-state additions

Recommended run fields:

```text
act.normalBattlesResolved
reward.pendingPacket
reward.rerollCredits
reward.revealState
reward.history[]
```

`pendingPacket` must survive app/background lifecycle and must be resolved before the run can leave the node.

## Test fixtures

Build deterministic fixtures for at least:

1. normal packet with no bonus;
2. normal packet with bonus;
3. normal packet with category affinity;
4. Elite packet;
5. Gatekeeper packet;
6. payable defeat — no packet;
7. Commander catalogue removes TOWER;
8. thesis floor inserts exactly one compatible offer;
9. component reroll persists across reload;
10. skip persists and grants Salvage once;
11. exhausted category falls back legally;
12. reward relic adds +1 offer without changing unrelated rolls more than the declared generation order requires.

## Exit condition

The reward seam is ready to connect to the rest of P2 when a player can:

**win battle → inspect persistent packet → reroll if entitled → claim/skip each component → see run state change → return to map → choose a route influenced by the new build → enter the next battle**

and repeating the same fixed seed produces the same unmodified packet.
