# v1.6 — Region Music & Audio Polish

## Goal
Give the existing SFX/ambience system a lightweight musical identity without shipping large audio assets or compromising mobile load time.

## Procedural music
`music-v16.js` generates the score in-browser with WebAudio using short synthesized plucks, low drones, and sparse percussion rather than pre-rendered tracks.

Region palettes:
- **Dustwater Gulch** — warm minor-pentatonic frontier motif
- **Boot Hill Midnight** — sparse cold/haunted intervals
- **Bone Orchard** — uneasy tritone-flavored pattern
- **Cinder Junction** — harsher low industrial pulse
- **Hollow Mesa** — airy spectral interval pattern

## Boss tension
Boss waves automatically switch the score into a denser, faster tension pattern while preserving the current region's tonal identity.

## Mobile behavior
- Music begins only after player interaction, respecting iOS/Safari autoplay rules.
- Hidden/background tabs stop scheduling notes.
- Returning to the game resumes the audio context as needed.
- Hero death briefly creates musical space for the death SFX.

## Settings
The existing Audio panel gains a Music volume slider and Music On / Music Off toggle. Music also respects the existing master-volume and master-mute values in `ips-audio-v1`.

Music preferences live in `ips-music-v1` and, like audio preferences, are not erased by a gameplay progress reset.

## Asset strategy
No external audio files are introduced. This keeps the prototype small and lets recorded Western instrumentation replace individual procedural voices later without changing the gameplay event architecture.

## Playtest focus
- Is music subtle enough to leave peg/shot SFX readable?
- Do regions feel sonically distinct?
- Does the boss pattern add tension without becoming annoying?
- Is the default music level appropriate on iPhone speakers?
