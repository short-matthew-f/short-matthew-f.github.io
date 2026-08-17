# v1.5 — Blueprint Research UX

## Goal
Make the blueprint gate read as a real progression system rather than a normal purchase button temporarily changing jobs.

## New flow
Each specialty now has three distinct states:

1. **Locked** — the required wave has not been cleared.
2. **Blueprint Available** — the wave milestone is complete, but the blueprint still requires an expensive research purchase.
3. **Researched** — the blueprint is owned; only now do the normal ammo/peg purchase buttons appear.

Buying a blueprint still does **not** grant the item. The player must separately buy the first round or peg afterward.

## Blueprint Desk
Board and Ammo sheets now contain a Frontier Research / Blueprint Desk showing:

- future wave requirement,
- blueprint name,
- what it unlocks,
- research cost,
- progress toward that cost using current Bounty Coins,
- researched state,
- the next unresearched blueprint emphasized visually.

## Current milestone schedule
The existing v1.2 pacing is retained for this test so we can improve clarity before changing numbers:

- Wave 5 — Incendiary Works — 250 coins
- Wave 10 — Gilded Cartridge — 650 coins
- Wave 15 — Splitter Jig — 1,100 coins
- Wave 22 — Longbore Tooling — 1,900 coins
- Wave 30 — Blast Press — 3,200 coins
- Wave 40 — Storm Coil — 5,200 coins

## Telemetry preparation
Blueprint save data now records purchase time, wave, and price in `ips-blueprints-v1.history`. This gives us a basis for later economy tuning without changing the authored costs blindly.

## Compatibility
Existing saves that already own specialty ammo or pegs are automatically treated as having researched the corresponding blueprint.
