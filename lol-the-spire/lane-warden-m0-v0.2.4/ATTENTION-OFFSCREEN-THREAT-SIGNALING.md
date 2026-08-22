# ATT-001 — Attention & Offscreen Threat Signaling

Status: **implemented for isolated human UX testing in M0-0.2.4**.

## Purpose

Help the player notice a strategically important threatened area without restoring large blocking overlays and without taking control of the camera. This is attention support, not an instruction to rescue the threatened lane.

## Behavior

- A brief, pointer-transparent toast appears when a qualifying threat first appears or escalates.
- A compact world-locked danger control points toward the threatened structure when it is offscreen.
- As the player pans the target into view, the control resolves onto the actual world position rather than continuing to point abstractly toward a lane.
- Tapping the control focuses the camera on the target.
- **No automatic camera pan or camera seizure occurs in normal play.**
- The rest of the layer is pointer-transparent; only the explicit focus control captures input.

## Initial threat policy

- Bastion warning: taking recent damage and at/below 75% HP.
- Bastion critical: taking recent damage and at/below 35% HP.
- Bastion lost: Core exposed.
- Core taking damage: critical.
- Commander at/below 30% HP: warning.

These thresholds are exploratory UX thresholds, not game-balance rules.

## Agency constraint

A warning says **“this matters”**, not **“fix this.”** Twin Toll explicitly depends on the player being allowed to recognize danger and still choose to let that lane fail. ATT-001 must therefore never auto-spend, auto-rally, auto-waypoint, or force a camera move.

## Evidence

Exports record `danger-cue` and `attention-focus-tap` events under `ATT-001`. The frozen gameplay runtime is not asked to log ATT-001 camera focus events.
