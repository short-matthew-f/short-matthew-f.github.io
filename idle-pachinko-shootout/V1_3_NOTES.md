# v1.3 — Stability + First Feel Pass

## Engine consolidation

v1.3 replaces the runtime chain of versioned source-rewriting loaders with one direct canonical engine: `engine-v13.js`.

The consolidated engine directly owns:

- save migration and persistence,
- pachinko physics and slot resolution,
- finite specialty ammunition and tune ranks,
- editable specialty pegs,
- combat damage and enemy traits,
- independent enemy lanes and attack clocks,
- focus targeting,
- guarded wave completion / empty-battlefield recovery,
- death → upgrades → Ride Again flow,
- bosses and loot decisions,
- the public `__ipsAPI` consumed by campaign/progression helpers.

The old versioned loader files remain in the repository for historical reference but are no longer loaded by `index.html`.

## First feel pass

v1.3 also begins the roadmap's game-feel and audio work:

- ball trails and stronger specialty-peg flashes,
- animated enemy idle/hit/lunge reactions,
- stronger muzzle flashes and specialty tracers,
- focus-target pulse,
- slot-hit feedback with stronger high-value-slot emphasis,
- subtle screen kick on crits, explosions, and incoming attacks,
- wave-clear / wallet pulses and boss-kill flash,
- synthesized WebAudio SFX for board, gunfire, combat, upgrades, loot, and death,
- low frontier-wind ambience,
- master / SFX / ambience controls and mute in Settings.

Audio is generated in-browser and begins only after player interaction to respect mobile autoplay rules.

## Debug / smoke-test hooks

The direct engine exposes `window.__ipsDebug` for prototype testing:

- `state()` — inspect the current wave/combat state
- `killWave()` — force-clear the current wave
- `killHero()` — force the death flow
- `restart()` — start a fresh run from the current checkpoint

## Local smoke checks completed

- JavaScript syntax checks pass for `engine-v13.js`, `audio-v14.js`, and `feel-v14.js`.
- Direct engine boots with no page exception in local Playwright harness.
- Automatic ball launch and moving combat state observed.
- Forced wave clear advances to the next wave.
- Forced death opens the death decision.
- Death → Spend XP → close sheet returns to Ride Again.
- Ride Again restarts the run.

## Playtest focus

Once deployed, verify on iPhone/Safari:

1. no startup error banner,
2. normal wave progression without empty-wave deadlock,
3. smooth independent enemy motion,
4. focus targeting,
5. death/upgrade/restart loop,
6. finite specialty-ammo limits,
7. audible SFX after the first tap,
8. Settings audio controls,
9. slot/crit/explosion visual feedback.
