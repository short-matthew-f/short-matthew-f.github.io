# v1.4 — Art Direction Pass I

## Goal
Move the live prototype from generic CSS/SVG presentation toward a recognizable **spooky pulp Western** identity without destabilizing the consolidated v1.3 engine.

## Presentation architecture
v1.4 deliberately leaves `engine-v13.js` unchanged. Presentation is layered through:

- `art-v15.js` — hero/enemy/boss SVG replacement, scenery injection, boss-intro presentation
- `art-v15.css` — region art direction, sprite palettes, board framing, environmental motion

This keeps gameplay and rendering state separate from cosmetic iteration.

## Character pass
- Rebuilt the Gunslinger silhouette with stronger hat/coat/holster/gun readability.
- Rebuilt Zombie, Ghoul, Ghost, and Troll silhouettes with clearly different body shapes.
- Added dedicated boss silhouettes for:
  - The Undertaker
  - Madame Dead-Eye
  - Big Hank the Grave Troll
  - Sheriff Nevermore
  - The Last Train
- Bosses are identified from the authored enemy name so no gameplay code needs to change.

## Region pass
Each campaign region now has its own environmental visual grammar:

1. **Dustwater Gulch** — orange sunset, cactus silhouettes, mesa/building forms
2. **Boot Hill Midnight** — cold moonlight, graves, low spectral haze
3. **Bone Orchard** — sickly dusk, dead trees and tangled forms
4. **Cinder Junction** — furnace sky, rail silhouettes, animated embers
5. **Hollow Mesa** — cold canyon tones, spectral haze, intermittent lightning

## Board/UI pass
- Added heavier wooden framing around the pachinko board.
- Reworked slot presentation toward engraved Western plaques.
- Strengthened edge-slot emphasis.
- Added richer typography treatment and shadows around combat labels.

## Boss presentation
Entering a boss wave now produces a short **WANTED DEAD OR DEADER** intro card before returning control to the normal battle view.

## Mobile / accessibility
- All new animation respects `prefers-reduced-motion`.
- No image downloads are required; the new presentation remains lightweight inline SVG/CSS.
- The engine remains the source of truth for targeting, movement, combat, saves, and progression.

## Playtest focus
- Are enemy families readable instantly without reading their names?
- Do the five regions feel visually distinct?
- Does the combat strip finally feel like a little supernatural Western battle rather than a HUD over counters?
- Does the richer art remain readable at iPhone size?
- Do boss silhouettes and boss intro feel special without obscuring gameplay?
