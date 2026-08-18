# Idle Pachinko Shootout — Runtime Architecture v1.13

## Why this pass exists

The pre-v1.13 prototype accumulated behavior through nested source-rewriting engine loaders and several DOM observers layered on top of the same upgrade sheet. That made small changes risky and allowed observer callbacks to react to their own DOM writes.

The concrete Board lock fixed by this pass was caused by the old peg controller observing the entire `#sheetContent` subtree while also rewriting text inside that subtree. Its own write produced another mutation, which could repeat indefinitely.

## Active runtime

The live page now has three project-owned core layers:

1. `settings-v130.js`
   - player settings and reset flow
   - one-time migration of the old peg shadow ledger
   - no periodic persistence polling

2. `engine-v130.js`
   - one static game engine
   - save/load and progression state
   - pachinko physics / balls / slots
   - combat, enemies, hero, ammo, gear, loot handoff
   - upgrade sheet generation
   - public `window.__ipsAPI`
   - **no runtime fetch-and-patch loader chain**

3. `runtime-v130.js`
   - rendered peg hardware
   - peg context menu / upgrade / move / sell
   - Firing Pin interaction
   - blueprint desk and gates
   - upgrade-sheet scroll preservation
   - compact enemy threat symbols
   - hero armor presentation
   - event-driven updates only

Audio, art, telemetry, death-spend flow, offline progression and sprite presentation remain separate feature modules because they do not rewrite the core engine or own the Board upgrade DOM.

## Event rule

Feature UI should respond to explicit `ips:*` events, not continuously observe broad DOM subtrees.

Allowed example:

```js
document.addEventListener('ips:pegUpgrade', renderBoard);
```

Avoid:

```js
new MutationObserver(rewriteSheet)
  .observe(sheetContent, { childList: true, subtree: true });
```

A narrow `childList` observer on `#enemyLane` is retained only to decorate newly replaced enemy elements. It does not observe descendants, so inserting threat icons cannot trigger it again.

## Save ownership

`ips-v7` remains the canonical persistent game save for compatibility with existing players.

Dynamic `pegMeta` keys are restored explicitly during engine load. The former `ips-peg-state-v2` / `ips-peg-meta-v1` shadow stores are imported once by `settings-v130.js` and then removed.

There should not be two authoritative stores for the same game state.

## Generated engine

`engine-v130.js` was deterministically flattened from the accepted v1.12.2 runtime chain by `tools/flatten-engine.mjs`. The old loader files remain in the repository as migration/history inputs but are not referenced by `index.html`.

CI regenerates the static engine and requires byte-for-byte agreement with the committed file. This proves that the static artifact is reproducible while removing all runtime `fetch()` / `new Function()` patching from player devices.

## Validation

`.github/workflows/ips-v130-check.yml` checks:

- JavaScript syntax for the static engine, consolidated runtime and settings
- direct static-engine wiring
- absence of old active Board/UI runtime layers in `index.html`
- absence of a broad upgrade-sheet subtree observer
- a JSDOM Board smoke test that opens the Board sheet and performs four consecutive upgrades
- peg metadata survival through engine load
- finite sheet mutation count (runaway regression check)

`.github/workflows/ips-flatten-engine.yml` regenerates `engine-v130.js`, syntax-checks it, and requires the committed artifact to match exactly.

## Rule for future work

New gameplay systems should be added to the static engine or to a clearly owned feature module. Do not add another source-rewriting loader on top of `engine-v130.js`.
